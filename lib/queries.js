import gql from 'graphql-tag';

export const query = {
  createCart: gql`
    mutation cartCreate {
      cartCreate {
        cart {
          id
          checkoutUrl
        }
        userErrors {
          code
          field
          message
        }
      }
    }
  `,
  fetchCart: gql`
    query fetchCart($id: ID!) {
      cart(id: $id) {
        id
        checkoutUrl
        createdAt
        updatedAt
        lines(first:10) {
          edges {
            node {
              id
              quantity
              merchandise {
                __typename
                ... on ProductVariant {
                  id
                  product {
                    id
                    productType
                    title
                    vendor
                    variants(first: 10) {
                      edges {
                        node {
                          id
                          title
                          sku
                        }
                      }
                    }
                  }
                }
              }
              sellingPlanAllocation {
                sellingPlan {
                  id
                  name
                }
                priceAdjustments {
                  price {
                    amount
                  }
                  compareAtPrice {
                    amount
                  }
                  perDeliveryPrice {
                    amount
                  }
                }
              }
            }
          }
        }
        estimatedCost {
          totalAmount {
            amount
            currencyCode
          }
          subtotalAmount {
            amount
            currencyCode
          }
          totalTaxAmount {
            amount
            currencyCode
          }
          totalDutyAmount {
            amount
            currencyCode
          }
        }
        buyerIdentity {
          email
          phone
          customer {
            id
          }
          countryCode
        }
      }
    }
  `,
  cartLinesAdd: gql`
    mutation cartLinesAdd($lines: [CartLineInput!]!, $cartId: ID!) {
      cartLinesAdd(lines: $lines, cartId: $cartId) {
        cart {
          id
          checkoutUrl
          createdAt
          updatedAt
          lines(first:10) {
            edges {
              node {
                id
                quantity
                merchandise {
                  __typename
                  ... on ProductVariant {
                    id
                    product {
                      id
                      productType
                      title
                      vendor
                      variants(first: 10) {
                        edges {
                          node {
                            id
                            title
                            sku
                          }
                        }
                      }
                    }
                  }
                }
                sellingPlanAllocation {
                  sellingPlan {
                    id
                    name
                  }
                  priceAdjustments {
                    price {
                      amount
                    }
                    compareAtPrice {
                      amount
                    }
                    perDeliveryPrice {
                      amount
                    }
                  }
                }
              }
            }
          }
          estimatedCost {
            totalAmount {
              amount
              currencyCode
            }
            subtotalAmount {
              amount
              currencyCode
            }
            totalTaxAmount {
              amount
              currencyCode
            }
            totalDutyAmount {
              amount
              currencyCode
            }
          }
          buyerIdentity {
            email
            phone
            customer {
              id
            }
            countryCode
          }
        }
        userErrors {
          code
          field
          message
        }
      }
    }
  `,
  cartLinesUpdate: gql`
    mutation cartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
      cartLinesUpdate(cartId: $cartId, lines: $lines) {
        cart {
          id
          checkoutUrl
          createdAt
          updatedAt
          lines(first:10) {
            edges {
              node {
                id
                quantity
                merchandise {
                  __typename
                  ... on ProductVariant {
                    id
                    product {
                      id
                      productType
                      title
                      vendor
                      variants(first: 10) {
                        edges {
                          node {
                            id
                            title
                            sku
                          }
                        }
                      }
                    }
                  }
                }
                sellingPlanAllocation {
                  sellingPlan {
                    id
                    name
                  }
                  priceAdjustments {
                    price {
                      amount
                    }
                    compareAtPrice {
                      amount
                    }
                    perDeliveryPrice {
                      amount
                    }
                  }
                }
              }
            }
          }
          estimatedCost {
            totalAmount {
              amount
              currencyCode
            }
            subtotalAmount {
              amount
              currencyCode
            }
            totalTaxAmount {
              amount
              currencyCode
            }
            totalDutyAmount {
              amount
              currencyCode
            }
          }
          buyerIdentity {
            email
            phone
            customer {
              id
            }
            countryCode
          }
        }
        userErrors {
          code
          field
          message
        }
      }
    }
  `,
  cartLinesRemove: gql`
    mutation cartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
      cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
        cart {
          id
          checkoutUrl
          createdAt
          updatedAt
          lines(first:10) {
            edges {
              node {
                id
                quantity
                merchandise {
                  __typename
                  ... on ProductVariant {
                    id
                    product {
                      id
                      productType
                      title
                      vendor
                      variants(first: 10) {
                        edges {
                          node {
                            id
                            title
                            sku
                          }
                        }
                      }
                    }
                  }
                }
                sellingPlanAllocation {
                  sellingPlan {
                    id
                    name
                  }
                  priceAdjustments {
                    price {
                      amount
                    }
                    compareAtPrice {
                      amount
                    }
                    perDeliveryPrice {
                      amount
                    }
                  }
                }
              }
            }
          }
          estimatedCost {
            totalAmount {
              amount
              currencyCode
            }
            subtotalAmount {
              amount
              currencyCode
            }
            totalTaxAmount {
              amount
              currencyCode
            }
            totalDutyAmount {
              amount
              currencyCode
            }
          }
          buyerIdentity {
            email
            phone
            customer {
              id
            }
            countryCode
          }
        }
        userErrors {
          code
          field
          message
        }
      }
    }
  `,
};