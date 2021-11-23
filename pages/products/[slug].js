import React, { useState, useEffect, useCallback } from 'react'
import TagManager from 'react-gtm-module'
import { v4 as uuidv4 } from 'uuid'
import { useRouter } from 'next/router'
import _get from 'lodash/get'
import axios from 'axios'
import useSWR from 'swr'

import Error from '@pages/404'
import Layout from '@components/layout'
import { getAllDocSlugs, getProduct } from '@lib/api'
import { centsToPrice, hasObject } from '@lib/helpers'
import { useSiteContext } from '@lib/context'
import { imageBuilder } from '@lib/sanity'
import { Module } from '@modules/index'
// import { trackFbEvent } from '@lib/fbPixel'

// setup our activeVariant hook
function useActiveVariant({ fallback, variants }) {
  const router = useRouter()
  const queryID = parseInt(router?.query?.variant)
  const hasVariant = variants.find((v) => v.id === queryID)
  const activeVariant = hasVariant ? queryID : fallback

  const setActiveVariant = useCallback(
    (variant) => {
      router.replace(
        `/products/${router?.query?.slug}?variant=${variant}`,
        undefined,
        {
          shallow: true,
        }
      )
    },
    [router]
  )

  return [activeVariant, setActiveVariant]
}

// setup our inventory fetcher
const fetchInventory = (url, id) =>
  axios
    .get(url, {
      params: {
        id: id,
      },
    })
    .then((res) => res.data)

const Product = ({ data }) => {
  const router = useRouter()
  const { shopCurrency } = useSiteContext();

  if (!router.isFallback && !data) {
    return <Error statusCode={404} />
  }

  // extract our data
  const { site, page } = data

  const pageProduct = page.product;
  // set our Product state
  const [product, setProduct] = useState(pageProduct)

  // find the default variant for this product by matching against the first product option
  const defaultVariant = pageProduct.variants?.find((v) => {
    const option = {
      name: pageProduct.options?.[0]?.name,
      value: pageProduct.options?.[0]?.values[0],
      position: pageProduct.options?.[0]?.position,
    }
    return hasObject(v.options, option)
  })

  // set our activeVariant state to our defaultVariant (if found) or first variant
  const [activeVariant, setActiveVariant] = useActiveVariant({
    fallback: defaultVariant?.id || pageProduct.variants[0].id,
    variants: pageProduct.variants,
  })

  // const [activeVariant, setActiveVariant] = useState(
  //   defaultVariant?.id || pageProduct.variants[0].id
  // )

  // Check our product inventory is still correct
  const { data: productInventory } = useSWR(
    ['/api/shopify/product-inventory', pageProduct.id],
    (url, id) => fetchInventory(url, id),
    { errorRetryCount: 3 }
  )

  // Rehydrate our product after inventory is fetched
  useEffect(() => {
    if (pageProduct && productInventory) {
      const { photos } = pageProduct;
      const productImageSrc = photos.main?.length ? imageBuilder.image(photos.main[0].photos[0]).url() : null;

      const newProduct = {
        ...pageProduct,
        inStock: productInventory.inStock,
        lowStock: productInventory.lowStock,
        variants: [
          ...pageProduct.variants.map((v) => {
            const newInventory = productInventory.variants.find(
              (nv) => nv.id === v.id
            )
            return newInventory ? { ...newInventory, ...v } : v
          }),
        ],
        sellingPlanId: productInventory.sellingPlanId,
        discountAmount: productInventory.discountAmount,
      }

      setProduct(newProduct)
      const activeVariantObj = newProduct.variants.find(
        (v) => v.id == activeVariant
      )

      const prevPath = localStorage.getItem("prevPath") || '/'

      TagManager.dataLayer({
        dataLayer: {
          event: 'dl_view_item',
          event_id: uuidv4(),
          ecommerce: {
            currencyCode: shopCurrency || "USD",
            detail: {
              actionField: {list: prevPath},
              products: [{
                name: pageProduct.title.replace("'", ''),
                id: activeVariantObj ? activeVariantObj.sku : "",
                product_id: pageProduct.id,
                variant_id: activeVariantObj ? activeVariantObj.id : "",
                image: productImageSrc,
                price: pageProduct.price / 100,
                brand: pageProduct.productVendor?.replace("'", ''),
                variant: activeVariantObj ? activeVariantObj.title.replace("'", '') : "",
                category: pageProduct.productType,
                inventory: activeVariantObj.inventory_quantity,
                list: prevPath,
              }]
            }
          }
        }
      })
    }

  }, [pageProduct, productInventory])

  if (!productInventory) return "Loading..."

  return (
    <>
      {!router.isFallback && (
        <Layout
          site={site}
          page={page}
          schema={getProductSchema(product, activeVariant, site)}
        >
          {page.modules?.map((module, key) => (
            <Module
              key={key}
              module={module}
              product={product}
              activeVariant={product.variants.find(
                (v) => v.id == activeVariant
              )}
              onVariantChange={setActiveVariant}
            />
          ))}
        </Layout>
      )}
    </>
  )
}

function getProductSchema(product, activeVariant, site) {
  if (!product) return null

  const router = useRouter()
  const { query } = router

  const variant = product.variants.find((v) => v.id == activeVariant)

  return {
    '@context': 'http://schema.org',
    '@type': 'Product',
    name: product.title,
    price: centsToPrice(query.variant ? variant.price : product.price),
    sku: query.variant ? variant.sku : product.sku,
    offers: {
      '@type': 'Offer',
      url: `${site.rootDomain}/products/${product.slug}${query.variant ? `?variant=${variant.id}` : ''
        }`,
      availability: query.variant
        ? `http://schema.org/${variant.inStock ? 'InStock' : 'SoldOut'}`
        : `http://schema.org/${product.inStock ? 'InStock' : 'SoldOut'}`,
      price: centsToPrice(query.variant ? variant.price : product.price),
      priceCurrency: 'USD',
    },
    brand: {
      '@type': 'Brand',
      name: site.seo.siteTitle,
    },
  }
}

export async function getStaticProps({ params, preview, previewData }) {
  const productData = await getProduct(params.slug, {
    active: preview,
    token: previewData?.token,
  })

  return {
    props: {
      data: productData,
    },
  }
}

export async function getStaticPaths() {
  const allProducts = await getAllDocSlugs('product')

  return {
    paths:
      allProducts?.map((page) => {
        return {
          params: {
            slug: page.slug,
          },
        }
      }) || [],
    fallback: false,
  }
}

export default Product
