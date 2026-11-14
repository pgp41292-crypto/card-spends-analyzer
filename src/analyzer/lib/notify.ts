/* Push-style toast for a completed card payment (shared by Demo panel and the checkout sheet). */
import type { Card } from '../types';
import { useUI } from '../store/ui';
import { CATEGORIES } from './categories';
import type { NewTxnInput } from './ledger';
import { inr, p } from './paths';

export function notifyPayment(input: NewTxnInput, card: Card) {
  useUI.getState().toast({
    title: `${inr(input.amount)} at ${input.merchantDisplayName ?? input.rawDescriptor} · ${card.issuer} ••${card.last4} · ${CATEGORIES[input.category].label}`,
    body: 'Card spend detected',
    to: p('/spends'),
  });
}
