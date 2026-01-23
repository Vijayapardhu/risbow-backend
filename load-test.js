import http from 'k6/http';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 10000 }, // Ramp up to 10k users
  ],
};

export default function () {
  const response = http.post('http://localhost:3000/api/v1/cart/items', {
    productId: 'sample-product-id',
    quantity: 1,
  });
  check(response, { 'status is 200': (r) => r.status === 200 });
}