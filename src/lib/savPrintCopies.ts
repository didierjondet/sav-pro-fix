export function getSAVPrintCopies(customerId?: string | null): ('client' | 'shop')[] {
  return customerId ? ['client', 'shop'] : ['shop'];
}