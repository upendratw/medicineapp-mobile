import { formatDecimalQuantity } from '@/utils/quantityFormat';

describe('formatDecimalQuantity', () => {
  test.each([
    ['10.0000', '10'],
    ['10.5000', '10.5'],
    ['10.2500', '10.25'],
    ['0.5000', '0.5'],
    ['0.1250', '0.125'],
    ['100.0000', '100'],
  ])('formats %s without rounding', (input, expected) => {
    expect(formatDecimalQuantity(input)).toBe(expected);
  });
});
