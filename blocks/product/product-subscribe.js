import React from 'react'
import Icon from '@components/icon'
import { centsToPrice } from '@lib/helpers'

const ProductSubscribe = ({ price, discount, subscribe, onChange }) => {
  return (
    <div className="m-4 ml-0 grid md:grid-cols-2 sm:grid-cols-1">
      <div className="flex mb-2 sub-pd">
        <div className="control">
          <input
            name="subscription"
            value="onetime"
            id="onetime-input"
            onChange={() => onChange('onetime')}
            checked={subscribe === 'onetime'}
            type="radio"
          />
          <label
            htmlFor="onetime-input"
            className="control--label for-checkbox"
          >
            <Icon name="Checkmark" />
            <p className="rc">One-time purchase: ${centsToPrice(price)}</p>
          </label>
        </div>
      </div>
      <div className="flex mb-2 sub-pd">
        <div className="control">
          <input
            name="subscription"
            value="subsave"
            id="subsave-input"
            onChange={() => onChange('subsave')}
            checked={subscribe === 'subsave'}
            type="radio"
          />
          <label
            htmlFor="subsave-input"
            className="control--label for-checkbox"
          >
            <Icon name="Checkmark" />
            <p className="rc">
              Subscribe & save: ${centsToPrice(price * (1-discount/100))}
              <span className="text-xs">
                Ships every 30 days. Cancel anytime.
              </span>
            </p>
          </label>
        </div>
      </div>
    </div>
  )
}

export default ProductSubscribe
