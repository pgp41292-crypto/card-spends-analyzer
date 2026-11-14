/* Sanity checks for the shared ledger logic (Flow B numbers). Run: node scripts/check-ledger.ts */
import { readFileSync } from 'node:fs';
import { applyCorrection, applyCreateSplit, applySettle, applyTransaction } from '../src/analyzer/lib/ledger.ts';
import { balances, whoShouldPay } from '../src/analyzer/lib/circles.ts';
import { limitStatus, monthSummary, spendByCategory, inMonth } from '../src/analyzer/lib/selectors.ts';
import { DEMO_MONTH } from '../src/analyzer/lib/clock.ts';
import type { PersonaData } from '../src/analyzer/types.ts';

const load = (p: string): PersonaData => {
  const f = (n: string) => JSON.parse(readFileSync(`src/data/${p}/${n}.json`, 'utf8'));
  return { cards: f('cards'), transactions: f('transactions'), limits: f('limits'), benefits: f('benefits'), charges: f('charges'), tips: f('tips'), circles: f('circles'), offers: f('offers') };
};
const ok = (cond: boolean, msg: string) => { if (!cond) throw new Error('FAIL: ' + msg); console.log('✓', msg); };

// Flow B: Neha simulates a ₹640 food payment on HDFC.
const neha = load('neha');
const food0 = limitStatus(neha.limits.find((l) => l.category === 'food')!, neha.transactions);
const sum0 = monthSummary(neha.transactions);
const m0 = neha.benefits.milestones.find((m) => m.cardId === 'c_hdfc')!.progress;
const { data, txn } = applyTransaction(neha, { cardId: 'c_hdfc', amount: 640, category: 'food', rawDescriptor: 'RAZ*SWIGGY PNQ', merchantDisplayName: 'Swiggy' }, 't_live_1');
const food1 = limitStatus(data.limits.find((l) => l.category === 'food')!, data.transactions);
ok(food0.pct < 80 && Math.round(food1.pct) === 82, `food limit crosses 80%: ${food0.pct.toFixed(1)}% → ${food1.pct.toFixed(1)}%`);
ok(monthSummary(data.transactions).thisMonth === sum0.thisMonth + 640, 'month total +₹640');
ok(data.benefits.milestones.find((m) => m.cardId === 'c_hdfc')!.progress === m0 + 640, 'HDFC milestone +₹640');
ok(txn.rewardEarned === 32 && txn.timestamp.startsWith(DEMO_MONTH), `reward ₹${txn.rewardEarned} at 5%, stamped ${txn.timestamp}`);
ok(data.transactions[0].id === 't_live_1', 'new row is first in feed');

// F2: correcting an unresolved row moves its amount between categories.
const unresolved = neha.transactions.find((t) => t.merchantSource === 'unresolved' && t.timestamp.startsWith(DEMO_MONTH))!;
const before = spendByCategory(inMonth(neha.transactions, DEMO_MONTH));
const fixed = applyCorrection(neha, unresolved.id, { category: 'health', merchantDisplayName: 'Local chemist' });
const after = spendByCategory(inMonth(fixed.transactions, DEMO_MONTH));
ok((after.health ?? 0) === (before.health ?? 0) + unresolved.amount, `correction moves ₹${unresolved.amount} ${unresolved.category} → health`);
ok(fixed.transactions.find((t) => t.id === unresolved.id)!.merchantSource === 'user_corrected', 'merchantSource = user_corrected');

// F7 link: Karan's shared hotel is excluded from limits when the toggle is on.
const karan = load('karan');
const hotel = karan.transactions.find((t) => t.isShared)!;
ok(hotel.recoverableAmount === 10000, 'Karan hotel recoverable ₹10,000');

// Flow D: "Who should pay?" for a ₹32,000 phone in Karan's Family circle → Riya's 10% offer.
const fam = karan.circles.circles.find((c) => c.id === 'circle_family')!;
const best = whoShouldPay(fam, karan, 'karan', 'shopping', 32000)[0];
ok(best.memberId === 'm_riya' && best.saving === 3200, `best payer: ${best.name} · ${best.cardName} saves ₹${best.saving}`);
const r1 = applyCreateSplit(karan, 'circle_family', 'm_karan', { title: 'New phone', category: 'shopping', amount: 32000, payerId: 'm_riya', memberIds: fam.members.map((m) => m.id) }, 't_live_1');
const fam1 = r1.data.circles.circles.find((c) => c.id === 'circle_family')!;
ok(fam1.splits[0].shares.length === 4 && balances(fam1, 'm_karan').owe === 8000 && !r1.txn, '4-way split; Karan owes ₹8,000; no card spend for Karan');
const settled = applySettle(r1.data, 'circle_family', fam1.splits[0].id, 'm_karan').circles.circles.find((c) => c.id === 'circle_family')!;
ok(balances(settled, 'm_karan').owe === 0, 'settling via UPI clears "You owe"');
// Karan pays a ₹2,000 dinner for the Goa circle: shared spend, ₹1,600 recoverable, excluded from his food limit.
const goa = karan.circles.circles.find((c) => c.id === 'circle_goa')!;
const foodLimit = (dd: PersonaData) => limitStatus(dd.limits.find((l) => l.category === 'food')!, dd.transactions).spent;
const r2 = applyCreateSplit(karan, 'circle_goa', 'm_karan', { title: 'Dinner', category: 'food', amount: 2000, payerId: 'm_karan', memberIds: goa.members.map((m) => m.id), cardId: 'c_kotak' }, 't_live_2');
ok(r2.txn?.isShared === true && r2.txn.recoverableAmount === 1600, 'payer feed gets a Shared spend with ₹1,600 recoverable');
ok(foodLimit(r2.data) === foodLimit(karan) + 400, 'food limit counts only Karan\'s ₹400 share');
ok(r2.data.circles.circles.find((c) => c.id === 'circle_goa')!.monthlyPaidForOthers === goa.monthlyPaidForOthers + 1600, 'paid-for-others meter +₹1,600');
console.log('\nAll ledger checks passed.');
