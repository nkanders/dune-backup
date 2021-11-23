import React from 'react'
import cx from 'classnames'

import { useSiteContext, useAddItem } from '@lib/context'

const ProductAdd = ({
  variantID,
  product,
  quantity = 1,
  subscribe = "onetime",
  className,
  children
}) => {
  const addItemToCart = useAddItem()
  const { cart, isLoading, isAdding } = useSiteContext()

  // Check that Shopify is connected
  if (!cart.id) {
    return (
      <span className={cx('is-disabled', className)} disabled>
        Unavailable
      </span>
    )
  }

  return (
    <>
      {
        (isLoading) ? (
          <button className={cx('is-disabled', className)} disabled>
            Loading...
          </button>
        ) : (
          <button
            className={cx(className, { 'is-disabled': isAdding })}
            onClick={() => addItemToCart(
              variantID,
              product,
              quantity,
              subscribe=(subscribe === "subsave"),
            )}
          >
            {isAdding ? 'Adding...' : <>{children ? children : 'Add to Cart'}</>}
          </button>
        )
      }
    </>
  )
}

export default ProductAdd
