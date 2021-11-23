import React, { createContext, useContext, useEffect, useState } from 'react'
import TagManager from 'react-gtm-module'
import { useMutation } from 'react-apollo'
import { v4 as uuidv4 } from 'uuid'
import { Base64 } from 'base64-string'

import { ApolloClient } from 'apollo-client'
import { createHttpLink } from 'apollo-link-http'
import { setContext } from 'apollo-link-context'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { query } from './queries'

// get our API clients (shopify + sanity)
import { decodeProductId, UTM_PARAMS } from '@lib/helpers'
import { getSanityClient, imageBuilder } from '@lib/sanity'

// get our global image GROQ
import { imageMeta } from '@lib/api'
// import { trackFbEvent } from '@lib/fbPixel';

const enc = new Base64()

// Apollo Client
const customFetch = (uri, options) => {
  const { operationName } = JSON.parse(options.body)
  const query = new URLSearchParams(location.search)

  const utmQuery = UTM_PARAMS.reduce((a, b) => {
    const param = query.get(b)
    if (param) {
      localStorage.setItem(b, param)
      return a + b + '=' + encodeURIComponent(param) + '&'
    } else if (localStorage.getItem(b)) {
      return a + b + '=' + encodeURIComponent(localStorage.getItem(b)) + '&'
    } else return a
  }, '')

  return fetch(
    `${
      operationName === 'cartCreate' && utmQuery !== ''
        ? uri + '?' + utmQuery
        : uri
    }`,
    options
  )
}

const httpLink = createHttpLink({
  uri: `https://${process.env.SHOPIFY_STORE_ID}.myshopify.com/api/2021-10/graphql.json`,
  fetch: customFetch,
})

const middlewareLink = setContext(() => ({
  headers: {
    'X-Shopify-Storefront-Access-Token': process.env.SHOPIFY_API_TOKEN,
  },
}))

const apolloClient = new ApolloClient({
  link: middlewareLink.concat(httpLink),
  cache: new InMemoryCache(),
})
// Apollo Client

// Set our initial context states
const initialContext = {
  meganav: {
    isOpen: false,
    activeID: null,
  },
  productCounts: [],
  isLoading: true,
  isAdding: false,
  isUpdating: false,
  isCartOpen: false,
  shopCurrency: 'USD',
  cart: {
    id: null,
    lineItems: [],
    subTotal: 0,
    checkoutUrl: null,
  },
}

// Set context
const SiteContext = createContext({
  context: initialContext,
  setContext: () => null,
})

// get associated variant from Sanity
const fetchVariant = async (id) => {
  const variant = await getSanityClient().fetch(
    `
      *[_type == "productVariant" && variantID == ${id}][0]{
        "product": *[_type == "product" && productID == ^.productID][0]{
          title,
          "slug": slug.current,
        },
        "id": variantID,
        title,
        price,
        "photos": {
          "cart": *[_type == "product" && productID == ^.productID][0].cartPhotos[]{
            forOption,
            "default": cartPhoto{
              ${imageMeta}
            },
          }
        },
        options[]{
          name,
          position,
          value
        }
      }
    `
  )

  return variant
}

// set Shopify variables
const shopifyCartID = 'shopify_cart_id'
const shopifyVariantGID = 'gid://shopify/ProductVariant/'
const shopifySellingPlanGID = 'gid://shopify/SellingPlan/'

// set our checkout states
const setCartState = async (cart, setContext, openCart) => {
  if (!cart) return null

  if (typeof window !== `undefined`) {
    localStorage.setItem(shopifyCartID, cart.id)
  }

  // get real lineItems data from Sanity
  const lineItems = await Promise.all(
    (cart.lines?.edges || []).map(async ({ node }) => {
      const variantID = enc
        .decode(node.merchandise.id)
        .split(shopifyVariantGID)[1]
      const variant = await fetchVariant(variantID)
      const sellingPlanAllocation = node.sellingPlanAllocation

      return {
        ...variant,
        quantity: node.quantity,
        lineID: node.id,
        product: {
          ...node.merchandise.product,
          variants: node.merchandise.product.variants.edges.map(({ node }) => ({
            ...node,
            id: enc.decode(node.id).split(shopifyVariantGID)[1],
          })),
        },
        sellingPlan: sellingPlanAllocation ? sellingPlanAllocation.sellingPlan : null,
        price: sellingPlanAllocation 
                ? parseFloat(sellingPlanAllocation.priceAdjustments[0].price.amount) * 100
                : variant.price
      }
    })
  )

  // update state
  setContext((prevState) => {
    return {
      ...prevState,
      isAdding: false,
      isLoading: false,
      isUpdating: false,
      isCartOpen: openCart ? true : prevState.isCartOpen,
      cart: {
        id: cart.id,
        lineItems: lineItems,
        checkoutUrl: cart.checkoutUrl,
        subTotal: parseFloat(cart.estimatedCost?.subtotalAmount?.amount || 0),
      },
    }
  })
}

/*  ------------------------------ */
/*  Our Context Wrapper
/*  ------------------------------ */

const SiteContextProvider = ({ data, children }) => {
  const { productCounts } = data

  const [context, setContext] = useState({
    ...initialContext,
    ...{ productCounts },
  })

  const [initContext, setInitContext] = useState(false)

  // Build a new cart
  const [createCartMutation, { loading: creatCartLoading }] = useMutation(
    query.createCart
  )

  useEffect(() => {
    // Shopify checkout not build yet
    if (!initContext) {
      const initializeCheckout = async () => {
        const existingCartID =
          typeof window !== 'undefined'
            ? localStorage.getItem(shopifyCartID)
            : false

        // existing Shopify checkout ID found
        if (existingCartID) {
          try {
            // fetch checkout from Shopify
            const {
              data: { cart: existingCart },
              loading: fetching,
            } = await apolloClient.query({
              query: query.fetchCart,
              variables: { id: existingCartID },
            })

            setContext((prevState) => {
              return { ...prevState, isLoading: fetching }
            })

            // Check if there are invalid items
            if (
              existingCart?.lines.edges.some(({ node }) => !node.merchandise.id)
            ) {
              throw new Error(
                'Invalid item in checkout. This variant was probably deleted from Shopify.'
              )
            }

            // Make sure this cart hasn’t already been purchased.
            if (existingCart?.checkoutUrl) {
              setCartState(existingCart, setContext)
              return
            }
          } catch (e) {
            localStorage.setItem(shopifyCartID, null)
          }
        }

        // Otherwise, create a new checkout!
        setContext((prevState) => {
          return { ...prevState, isLoading: creatCartLoading }
        })

        const {
          data: {
            cartCreate: { cart },
          },
        } = await createCartMutation()
        if (!creatCartLoading && cart) setCartState(cart, setContext)
      }

      // Initialize the store context
      initializeCheckout()
      setInitContext(true)
    }
  }, [initContext, context, setContext, createCartMutation])

  return (
    <SiteContext.Provider
      value={{
        context,
        setContext,
      }}
    >
      {children}
    </SiteContext.Provider>
  )
}

// Access our global store states
function useSiteContext() {
  const { context } = useContext(SiteContext)
  return context
}

// Toggle Mega Navigation states
function useToggleMegaNav() {
  const {
    context: { meganav },
    setContext,
  } = useContext(SiteContext)

  async function toggleMegaNav(state, id = null) {
    setContext((prevState) => {
      return {
        ...prevState,
        meganav: {
          isOpen: state === 'toggle' ? !meganav.isOpen : state,
          activeID: state === 'toggle' && meganav.isOpen ? null : id,
        },
      }
    })
  }
  return toggleMegaNav
}

/*  ------------------------------ */
/*  Our Shopify context helpers
/*  ------------------------------ */

// Access our cart item count
function useCartCount() {
  const {
    context: { cart },
  } = useContext(SiteContext)

  let count = 0

  if (cart.lineItems) {
    count = cart.lineItems.reduce((total, item) => item.quantity + total, 0)
  }

  return count
}

// Access our cart totals
function useCartTotals() {
  const {
    context: { cart },
  } = useContext(SiteContext)

  const subTotal = cart.subTotal ? cart.subTotal * 100 : false
  return {
    subTotal,
  }
}

// Access our cart items
function useCartItems() {
  const {
    context: { cart },
  } = useContext(SiteContext)

  return cart.lineItems
}

// Add an item to the checkout cart
function useAddItem() {
  const {
    context: { cart, shopCurrency },
    setContext,
  } = useContext(SiteContext)

  const [addCartMutation, { loading }] = useMutation(query.cartLinesAdd)

  async function addItem(variantID, product, quantity, subscribe = false) {
    // Bail if no ID or quantity given
    if (!variantID || !quantity) return

    // Otherwise, start adding the product
    setContext((prevState) => {
      return { ...prevState, isAdding: true }
    })

    // Build the cart line item
    const newItem = {
      quantity: quantity,
      merchandiseId: enc.urlEncode(shopifyVariantGID + variantID), // build encoded variantID
    }

    const { photos, sellingPlanId } = product
    if (!!(subscribe && sellingPlanId)) {
      newItem['sellingPlanId'] = enc.urlEncode(
        shopifySellingPlanGID + sellingPlanId
      )
    }

    // Add it to the Shopify checkout cart
    const {
      data: {
        cartLinesAdd: { cart: newCart },
      },
    } = await addCartMutation({
      variables: {
        lines: [newItem],
        cartId: cart.id
      },
    })

    // Update our global store states
    if (!loading && newCart) {
      // GTM
      const productImageSrc = photos.main[0]
        ? imageBuilder.image(photos.main[0].photos[0]).url()
        : null
      const activeVariantObj = product.variants.find((v) => v.id == variantID)
      const prevPath = localStorage.getItem('prevPath') || '/'

      TagManager.dataLayer({
        dataLayer: {
          event: 'dl_add_to_cart',
          event_id: uuidv4(),
          ecommerce: {
            currencyCode: shopCurrency || 'USD',
            add: {
              actionField: { list: prevPath },
              products: [
                {
                  name: product.title.replace("'", ''),
                  id: activeVariantObj ? activeVariantObj.sku : '',
                  product_id: product.id,
                  variant_id: activeVariantObj ? activeVariantObj.id : '',
                  image: productImageSrc,
                  price: product.price / 100,
                  brand: product.productVendor?.replace("'", ''),
                  variant: activeVariantObj
                    ? activeVariantObj.title.replace("'", '')
                    : '',
                  category: product.productType,
                  quantity: quantity,
                  list: prevPath,
                },
              ],
            },
          },
        },
      })
      // GTM

      setCartState(newCart, setContext, true)
    }
  }

  return addItem
}

// Update item in cart
function useUpdateItem() {
  const {
    context: { cart },
    setContext,
  } = useContext(SiteContext)

  const [cartLinesUpdate, { loading }] = useMutation(query.cartLinesUpdate)

  async function updateItem(itemID, quantity) {
    // Bail if no ID or quantity given
    if (!itemID || !quantity) return

    // Otherwise, start adding the product
    setContext((prevState) => {
      return { ...prevState, isUpdating: true }
    })

    const newItem = {
      quantity: quantity,
      id: itemID,
    }

    // Add it to the Shopify checkout cart
    const {
      data: {
        cartLinesUpdate: { cart: newCart },
      },
    } = await cartLinesUpdate({
      variables: {
        lines: [newItem],
        cartId: cart.id,
      },
    })

    if (!loading && newCart) setCartState(newCart, setContext)
  }
  return updateItem
}

// Remove item from cart
function useRemoveItem() {
  const {
    context: { cart, shopCurrency },
    setContext,
  } = useContext(SiteContext)

  const [cartLinesRemove, { loading }] = useMutation(query.cartLinesRemove)
  async function removeItem(item) {
    // Bail if no ID given
    if (!item.lineID) return

    // Otherwise, start removing the product
    setContext((prevState) => {
      return { ...prevState, isUpdating: true }
    })

    // Add it to the Shopify checkout cart
    const {
      data: {
        cartLinesRemove: { cart: newCart },
      },
    } = await cartLinesRemove({
      variables: {
        lineIds: [item.lineID],
        cartId: cart.id,
      },
    })

    // GTM
    const { photos, product } = item
    const productImageSrc = photos.cart
      ? imageBuilder.image(photos.cart[0].default).url()
      : null
    const activeVariantObj = product.variants.find(
      (v) => v.id === item.id.toString()
    )
    const productId = decodeProductId(product.id)

    TagManager.dataLayer({
      dataLayer: {
        event: 'dl_remove_from_cart',
        event_id: uuidv4(),
        ecommerce: {
          currencyCode: shopCurrency || 'USD',
          remove: {
            actionField: { list: location.pathname },
            products: [
              {
                name: product.title.replace("'", ''),
                id: activeVariantObj ? activeVariantObj.sku : '',
                product_id: productId,
                variant_id: activeVariantObj ? activeVariantObj.id : '',
                image: productImageSrc,
                price: item.price / 100,
                brand: product.vendor.replace("'", ''),
                variant: activeVariantObj
                  ? activeVariantObj.title.replace("'", '')
                  : '',
                category: product.productType,
                list: location.pathname,
              },
            ],
          },
        },
      },
    })
    // GTM

    if (!loading && newCart) {
      setCartState(newCart, setContext)
    }
  }

  return removeItem
}

// Build our Checkout URL
function useCheckout() {
  const {
    context: { cart },
  } = useContext(SiteContext)

  return cart.checkoutUrl
}

// Toggle cart state
function useToggleCart() {
  const {
    context: { isCartOpen },
    setContext,
  } = useContext(SiteContext)

  async function toggleCart() {
    setContext((prevState) => {
      return { ...prevState, isCartOpen: !isCartOpen }
    })
  }
  return toggleCart
}

// Reference a collection product count
function useProductCount() {
  const {
    context: { productCounts },
  } = useContext(SiteContext)

  function productCount(collection) {
    const collectionItem = productCounts.find((c) => c.slug === collection)
    return collectionItem.count
  }

  return productCount
}

function useShopCurrency() {
  function updateShopCurrency(currency) {
    setContext((prevState) => {
      return { ...prevState, shopCurrency: currency }
    })
  }

  return updateShopCurrency
}

export {
  apolloClient,
  SiteContextProvider,
  useSiteContext,
  useToggleMegaNav,
  useCartCount,
  useCartTotals,
  useCartItems,
  useAddItem,
  useUpdateItem,
  useRemoveItem,
  useCheckout,
  useToggleCart,
  useProductCount,
  useShopCurrency,
}
