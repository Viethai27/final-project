import { useEffect, useMemo, useState } from 'react';
import { CreditCard, RefreshCcw, Search } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { ErrorState, EmptyState, LoadingState } from '../components/common/PageState';
import { invoiceApi } from '../services/invoiceApi';
import type { InvoiceSummaryDto } from '../services/backend-types';
import { formatDateTime } from '../lib/format';
import { clsx } from 'clsx';
import { useAuth } from '../context/AuthContext';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

const STATUS_LABELS: Record<string, string> = {
  UNPAID: 'Chưa thanh toán',
  PARTIAL: 'Thanh toán một phần',
  PAID: 'Đã thanh toán',
  REFUNDED: 'Hoàn tiền',
  CANCELLED: 'Đã hủy',
};

function InvoiceStatus({ status }: { status: string }) {
  return (
    <span
      className={clsx(
        'inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold',
        status === 'PAID'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : status === 'UNPAID'
            ? 'border-amber-200 bg-amber-50 text-amber-700'
            : 'border-gray-200 bg-gray-50 text-gray-600',
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export default function PaymentPage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<InvoiceSummaryDto[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [payingId, setPayingId] = useState<string | null>(null);

  const loadInvoices = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await invoiceApi.list();
      setInvoices(response.data);
      setSelectedId(current =>
        current && response.data.some(invoice => invoice.invoiceId === current)
          ? current
          : response.data[0]?.invoiceId ?? null,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được danh sách hóa đơn.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadInvoices();
  }, []);

  const filteredInvoices = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return invoices;
    }

    return invoices.filter(invoice =>
      [
        invoice.invoiceId,
        invoice.visit.queueNumber ?? '',
        invoice.visit.patient.fullName,
        invoice.visit.patient.patientCode,
        invoice.status,
      ].join(' ').toLowerCase().includes(term),
    );
  }, [invoices, search]);

  const selectedInvoice = filteredInvoices.find(invoice => invoice.invoiceId === selectedId) ?? filteredInvoices[0] ?? null;

  const handlePay = async (invoice: InvoiceSummaryDto) => {
    setPayingId(invoice.invoiceId);
    setError('');
    try {
      await invoiceApi.pay(invoice.invoiceId, {
        paymentMethod: 'CASH',
        paidById: user?.id ?? null,
      });
      await loadInvoices();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không xác nhận được thanh toán.');
    } finally {
      setPayingId(null);
    }
  };

  return (
    <Layout pageTitle="Thanh toán">
      <div className="space-y-5">
        <div className="rounded-[2rem] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700">
                Payment tối thiểu
              </p>
              <h1 className="mt-3 text-2xl font-black text-gray-950 md:text-3xl">Hóa đơn chờ thanh toán</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                Hiển thị dịch vụ phát sinh theo visit, tổng tiền và xác nhận thanh toán bằng API thật.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadInvoices()}
              className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 shadow-sm hover:bg-emerald-50"
            >
              <RefreshCcw size={16} />
              Làm mới
            </button>
          </div>
        </div>

        {error ? <ErrorState message={error} onRetry={() => void loadInvoices()} /> : null}

        {loading ? (
          <LoadingState label="Đang tải hóa đơn..." />
        ) : invoices.length === 0 ? (
          <EmptyState title="Chưa có hóa đơn" description="Bác sĩ cần kết luận visit để tạo hóa đơn chờ thanh toán." />
        ) : (
          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-3">
              <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    className="w-full rounded-xl border border-gray-200 py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-sky-100"
                    placeholder="Tìm theo bệnh nhân, mã hóa đơn, số lượt..."
                  />
                </div>
              </div>

              <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Hóa đơn</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Bệnh nhân</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Tổng tiền</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map(invoice => (
                      <tr
                        key={invoice.invoiceId}
                        onClick={() => setSelectedId(invoice.invoiceId)}
                        className={clsx(
                          'cursor-pointer border-t border-gray-50 hover:bg-gray-50',
                          selectedInvoice?.invoiceId === invoice.invoiceId && 'bg-emerald-50/60',
                        )}
                      >
                        <td className="px-4 py-3">
                          <div className="font-mono text-xs font-black text-sky-700">{invoice.invoiceId}</div>
                          <div className="mt-1 text-xs text-gray-400">{formatDateTime(invoice.createdAt)}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-800">{invoice.visit.patient.fullName}</div>
                          <div className="text-xs text-gray-400">
                            {invoice.visit.queueNumber} · {invoice.visit.patient.patientCode}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-bold text-gray-900">{formatCurrency(invoice.totalAmount)}</td>
                        <td className="px-4 py-3">
                          <InvoiceStatus status={invoice.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              {selectedInvoice ? (
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Chi tiết hóa đơn</p>
                      <h2 className="mt-1 text-lg font-black text-gray-950">{selectedInvoice.visit.patient.fullName}</h2>
                      <p className="mt-1 text-xs text-gray-500">{selectedInvoice.visit.queueNumber}</p>
                    </div>
                    <InvoiceStatus status={selectedInvoice.status} />
                  </div>

                  <div className="mt-5 space-y-3">
                    {selectedInvoice.items.map(item => (
                      <div key={item.invoiceItemId} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-gray-800">{item.description}</p>
                            <p className="mt-1 text-xs text-gray-500">
                              SL {item.quantity} · {formatCurrency(item.unitPrice)}
                            </p>
                          </div>
                          <p className="font-bold text-gray-900">{formatCurrency(item.totalPrice)}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-emerald-800">Tổng thanh toán</span>
                      <span className="text-xl font-black text-emerald-700">{formatCurrency(selectedInvoice.totalAmount)}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handlePay(selectedInvoice)}
                    disabled={selectedInvoice.status === 'PAID' || payingId === selectedInvoice.invoiceId}
                    className={clsx(
                      'mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-white transition',
                      selectedInvoice.status !== 'PAID' && payingId !== selectedInvoice.invoiceId
                        ? 'bg-emerald-600 hover:bg-emerald-700'
                        : 'cursor-not-allowed bg-gray-300',
                    )}
                  >
                    <CreditCard size={16} />
                    {selectedInvoice.status === 'PAID'
                      ? 'Đã thanh toán'
                      : payingId === selectedInvoice.invoiceId
                        ? 'Đang xác nhận...'
                        : 'Xác nhận thanh toán tiền mặt'}
                  </button>
                </div>
              ) : (
                <EmptyState title="Chọn hóa đơn" description="Chọn một hóa đơn để xem chi tiết." />
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
