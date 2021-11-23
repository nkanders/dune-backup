import axios from 'axios'

export default async function send(req, res) {
  const hasShopify =
    process.env.SHOPIFY_STORE_ID && process.env.SHOPIFY_API_PASSWORD

  if (!hasShopify) {
    return res.status(401).json({ error: 'Shopify API not setup' })
  }

  // Setup our Shopify connection
  const shopifyConfig = {
    'Content-Type': 'application/json',
    'X-Shopify-Access-Token': process.env.SHOPIFY_API_PASSWORD,
  }

  const shopifyShop = await axios({
    url: `https://${process.env.SHOPIFY_STORE_ID}.myshopify.com//admin/api/2021-10/shop.json`,
    method: 'GET',
    headers: shopifyConfig,
  }).then(re => re.data);

  res.statusCode = 200
  res.json({...shopifyShop.shop})
}
