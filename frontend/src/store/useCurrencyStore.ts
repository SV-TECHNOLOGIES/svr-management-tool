import { create } from 'zustand';

type Currency = 'INR' | 'GBP';

interface CurrencyState {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  formatPrice: (amount: number) => string;
}

export const useCurrencyStore = create<CurrencyState>((set, get) => ({
  currency: 'GBP',
  setCurrency: (currency) => set({ currency }),
  formatPrice: (amount) => {
    const { currency } = get();
    if (currency === 'INR') {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
      }).format(amount * 100); // Assuming base price is GBP or we have a rate
    }
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  },
}));
