import React, { useState } from 'react'
import { m } from 'framer-motion'
import Link from 'next/link'
import cx from 'classnames'
import TagManager from 'react-gtm-module'
import { v4 as uuidv4 } from 'uuid'

import { hasObject } from '@lib/helpers'
import { useSiteContext } from '@lib/context'

import {
  ProductGallery,
  ProductThumbnail,
  ProductPrice,
  ProductOption,
} from '@blocks/product'

const itemAnim = {
  initial: {
    opacity: 0,
  },
  show: (i) => ({
    opacity: 1,
    transition: {
      delay: i * 0.05 + 0.4,
      duration: 0.3,
      ease: 'linear',
    },
  }),
  hide: (i) => ({
    opacity: 0,
    transition: {
      delay: i * 0.05,
      duration: 0.3,
      ease: 'linear',
    },
  }),
}

const ProductCard = ({
  product,
  index,
  hasVisuals,
  showGallery,
  showThumbs,
  showPrice,
  showOption,
  className,
  onClick,
}) => {
  if (!product) return null
  const { shopCurrency } = useSiteContext();

  // find default variant for product
  const defaultVariant = product.variants?.find((v) => {
    const option = {
      name: product.options[0]?.name,
      value: product.options[0]?.values[0],
      position: product.options[0]?.position,
    }
    return hasObject(v.options, option)
  })

  // set active variant as default
  const [activeVariant, setActiveVariant] = useState(
    defaultVariant ? defaultVariant : product.variants[0]
  )

  // assign the new variant when options are changed
  const changeActiveVariant = (id) => {
    const newActiveVariant = product.variants.find((v) => v.id === id)
    setActiveVariant(newActiveVariant)
  }

  const onProductClick = () => {
    TagManager.dataLayer({
      dataLayer: {
        event: 'dl_select_item',
        event_id: uuidv4(),
        ecommerce: {
          currencyCode: shopCurrency,
          click: {
            actionField: { list: location.pathname },
            products: {
              name: product.title.replace("'", ''),
              id: activeVariant ? activeVariant.sku : "",
              product_id: product.id,
              variant_id: activeVariant ? activeVariant.id : "",
              price: product.price / 100,
              brand: product.productVendor?.replace("'", ''),
              position: index,
              category: product.productType,
              list: location.pathname,
            }
          }
        }
      }
    })

    if (onClick) onClick();
  }

  return (
    <m.div
      initial="initial"
      animate="show"
      exit="hide"
      custom={index}
      variants={itemAnim}
      className={cx('product-card', className)}
    >
      {hasVisuals && (
        <div className="product-card--visuals">
          {/* Show Gallery */}
          {showGallery && (
            <div className="product-card--gallery">
              <ProductGallery
                photosets={product.photos.main}
                activeVariant={activeVariant}
                hasArrows
                hasDots
                hasDrag={false}
              />
            </div>
          )}

          {/* Show Thumbnail */}
          {showThumbs && (
            <div className="product-card--thumb">
              <ProductThumbnail
                thumbnails={product.photos.listing}
                activeVariant={activeVariant}
              />
            </div>
          )}
        </div>
      )}

      <div className="product-card--details">
        <div className="product-card--header">
          <h2 className="product-card--title">
            <Link
              href={`/products/${
                product.slug +
                (product.surfaceOption ? `?variant=${activeVariant.id}` : '')
              }`}
              scroll={false}
            >
              <a className="product-card--link" onClick={onProductClick}>
                {product.title}
              </a>
            </Link>
          </h2>

          {showPrice && (
            <ProductPrice
              price={activeVariant ? activeVariant.price : product.price}
              comparePrice={
                activeVariant
                  ? activeVariant.comparePrice
                  : product.comparePrice
              }
            />
          )}
        </div>

        {/* Surfaced Option */}
        {showOption && (
          <div className="product-card--option">
            {product.options?.map(
              (option, key) =>
                option.position === parseInt(product.surfaceOption) &&
                option.values.length > 1 && (
                  <ProductOption
                    key={key}
                    position={key}
                    option={option}
                    optionSettings={product.optionSettings}
                    variants={product.variants}
                    activeVariant={activeVariant}
                    strictMatch={false}
                    hideLabels
                    onChange={changeActiveVariant}
                  />
                )
            )}
          </div>
        )}
      </div>
    </m.div>
  )
}

export default ProductCard
