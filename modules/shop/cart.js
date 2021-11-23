import React, { useState, useEffect } from 'react'
import TagManager from 'react-gtm-module'
import { v4 as uuidv4 } from 'uuid'
import FocusTrap from 'focus-trap-react'
import _isEmpty from 'lodash/isEmpty'
import { m } from 'framer-motion'
import cx from 'classnames'

import { centsToPrice, decodeProductId } from '@lib/helpers'
import CartItem from '@blocks/shop/cart-item'

import {
  useSiteContext,
  useCartTotals,
  useCartCount,
  useCartItems,
  useCheckout,
  useToggleCart,
} from '@lib/context'
// import { trackFbEvent } from '@lib/fbPixel'

const Cart = ({ data }) => {
  const { cart } = data

  const { isCartOpen, isUpdating, shopCurrency } = useSiteContext()
  const { subTotal } = useCartTotals()
  const cartCount = useCartCount()
  const lineItems = useCartItems()
  const checkoutURL = useCheckout()
  const toggleCart = useToggleCart()

  const [hasFocus, setHasFocus] = useState(false)
  const [checkoutLink, setCheckoutLink] = useState(checkoutURL)

  const handleKeyup = (e) => {
    if (e.which === 27) {
      toggleCart(false)
    }
  }

  const goToCheckout = (e) => {
    e.preventDefault()
    toggleCart(false)

    setTimeout(() => {
      window.open(checkoutLink, '_self')
    }, 200)
  }
  
  useEffect(() => {
    if (checkoutURL) {
      const buildCheckoutLink = cart.storeURL
        ? checkoutURL.replace(
            /^(?:https?:\/\/)?(?:[^@\/\n]+@)?(?:www\.)?([^:\/?\n]+)/g,
            cart.storeURL
          )
        : checkoutURL
      setCheckoutLink(buildCheckoutLink)
    }
  }, [checkoutURL])

  useEffect(() => {
    if (isCartOpen && hasFocus && !_isEmpty(lineItems)) {      
      // GTM
      TagManager.dataLayer({
        dataLayer: {
          event: 'dl_view_cart',
          event_id: uuidv4(),
          cart_total: subTotal / 100,
          ecommerce: {
            currencyCode: shopCurrency || "USD",
            actionField: { list: "Shopping Cart" },
            impressions: lineItems.map((item, idx) => {
              const { product } = item;
              const activeVariantObj = product.variants.find((v) => v.id === item.id.toString());
              const productId = decodeProductId(product.id)

              return {
                position: idx,
                id: activeVariantObj.sku,
                product_id: productId,
                variant_id: activeVariantObj.id,
                name: product.title.replace("'", ''),
                category: product.productType,
                quantity: item.quantity,
                price: item.price / 100,
                brand: product.vendor.replace("'", ''),
                variant: activeVariantObj ? activeVariantObj.title.replace("'", '') : ""
              }
            })
          }
        }
      })
      // GTM
    }
  }, [isCartOpen, hasFocus, lineItems, subTotal])

  return (
    <>
      <FocusTrap
        active={isCartOpen && hasFocus}
        focusTrapOptions={{ allowOutsideClick: true }}
      >
        <m.div
          initial="hide"
          animate={isCartOpen ? 'show' : 'hide'}
          variants={{
            show: {
              x: '0%',
            },
            hide: {
              x: '100%',
            },
          }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          onKeyUp={(e) => handleKeyup(e)}
          onAnimationComplete={() => setHasFocus(isCartOpen)}
          className={cx('cart is-inverted', {
            'is-active': isCartOpen,
            'is-updating': isUpdating,
          })}
        >
          <div className="cart--inner">
            <div className="cart--header">
              <div className="cart--title">
                Your Cart <span className="cart--count">{cartCount}</span>
              </div>
              <button className="cart-toggle" onClick={() => toggleCart(false)}>
                Close
              </button>
            </div>

            <div className="cart--content">
              {lineItems?.length ? (
                <CartItems items={lineItems} />
              ) : (
                <EmptyCart />
              )}
            </div>

            {lineItems?.length > 0 && (
              <div className="cart--footer">
                <div className="cart--subtotal">
                  <span>Subtotal</span>
                  <span>${centsToPrice(subTotal)}</span>
                </div>

                <a
                  onClick={(e) => goToCheckout(e)}
                  className="btn is-primary is-large is-block"
                >
                  {isUpdating ? 'Updating...' : 'Checkout'}
                </a>

                {cart.message && (
                  <p className="cart--message">{cart.message}</p>
                )}
              </div>
            )}
          </div>
        </m.div>
      </FocusTrap>

      <div
        className={cx('cart--backdrop', {
          'is-active': isCartOpen,
        })}
        onClick={() => toggleCart(false)}
      />
    </>
  )
}

const CartItems = ({ items }) => {
  return (
    <div className="cart--items">
      {items.map((item) => {
        return <CartItem key={item.lineID} item={item} />
      })}
    </div>
  )
}

const EmptyCart = () => (
  <div className="cart--empty">
    <p>Your cart is empty.</p>
  </div>
)

export default Cart
