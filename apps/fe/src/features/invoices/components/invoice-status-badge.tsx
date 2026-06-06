import { FormattedMessage } from 'react-intl';
import { Badge } from '@/components/ui/badge';
import type { InvoiceDisplayStatus } from '@simple-invoice/shared';

const statusVariant: Record<InvoiceDisplayStatus, 'muted' | 'warning' | 'success' | 'danger'> = {
  Draft: 'muted',
  Pending: 'warning',
  Paid: 'success',
  Overdue: 'danger',
};

export default function InvoiceStatusBadge({ status }: { status: InvoiceDisplayStatus }) {
  return (
    <Badge variant={statusVariant[status]}>
      <FormattedMessage id={`status.${status}`} defaultMessage={status} />
    </Badge>
  );
}
