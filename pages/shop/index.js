import React, { useEffect } from 'react'
import axios from 'axios'
import _isEmpty from 'lodash/isEmpty'
import TagManager from 'react-gtm-module'
import useSWR from 'swr'
import { v4 as uuidv4 } from 'uuid'

import Layout from '@components/layout'
import { getStaticPage, modules, allProducts } from '@lib/api'
import { useShopCurrency } from '@lib/context'
import { Module } from '@modules/index'

const Shop = ({ data }) => {
  const { site, page } = data
  const shopCurrency = useShopCurrency();

  const { data: shopData } = useSWR(
    '/api/shopify/shop', (url) => axios.get(url).then((res) => res.data)
  );

  useEffect(() => {
    if (!_isEmpty(page.products) && shopData) {
      shopCurrency(shopData.currency);

      TagManager.dataLayer({
        dataLayer: {
          event: 'dl_view_item_list',
          event_id: uuidv4(),
          ecommerce: {
            currencyCode: shopData.currency,
            impressions: page.products.map((product, index) => {
              const {
                title,
                variants,
                price,
                productVendor,
                productType
              } = product;

              return {
                name: title.replace("'", ''),
                id: variants[0] ? variants[0].sku : "",
                product_id: product.id,
                variant_id: variants?.length > 0 ? variants[0].id : "",
                price: price / 100,
                brand: productVendor?.replace("'", ''),
                position: index,
                category: productType,
                list: location.pathname
              }
            }),
          }
        }
      })
    }
  }, [page.products, shopData])

  return (
    <Layout site={site} page={page}>
      {page.modules?.map((module, key) => (
        <Module
          key={key}
          module={module}
          collectionProducts={page.products}
          featuredProducts={page.featuredProducts}
        />
      ))}
    </Layout>
  )
}

export async function getStaticProps({ preview, previewData }) {
  const shopData = await getStaticPage(
    `
    *[_type == "shopPage"] | order(_updatedAt desc)[0]{
      hasTransparentHeader,
      modules[]{
        ${modules}
      },
      "products": ${allProducts(preview)},
      "featuredProducts": featuredProducts[]->productID,
      seo
    }
  `,
    {
      active: preview,
      token: previewData?.token,
    }
  )

  return {
    props: {
      data: shopData,
    },
  }
}

export default Shop
