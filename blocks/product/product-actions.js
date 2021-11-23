import React, { useState } from 'react'

import {
  ProductCounter,
  ProductAdd,
  ProductWaitlist,
  ProductSubscribe,
} from '@blocks/product'

const ProductActions = ({ product, activeVariant }) => {
  // set default quantity
  const [quantity, setQuantity] = useState(1)
  const [subscribe, setSubScribe] = useState('onetime')
  const { klaviyoAccountID } = product;

  return (
    <div className="product--actions">
      {activeVariant?.inStock ? (
        <>
         {product.sellingPlanId && (
            <ProductSubscribe
              onChange={setSubScribe}
              subscribe={subscribe}
              price={activeVariant.price}
              discount={product.discountAmount}
            />
         )}
          <div className="flex mt-4">
            <ProductCounter
              id={activeVariant.id}
              max={10}
              onUpdate={setQuantity}
            />
            <ProductAdd
              variantID={activeVariant.id}
              product={product}
              quantity={quantity}
              subscribe={subscribe}
              className="btn is-primary is-large is-block"
            >
              Add To Cart
            </ProductAdd>
          </div>
        </>
      ) : (
        <>
          {klaviyoAccountID ? (
            <ProductWaitlist
              variant={activeVariant.id}
              klaviyo={klaviyoAccountID}
            />
          ) : (
            <div className="btn is-large is-disabled is-block">
              Out of Stock
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default ProductActions
