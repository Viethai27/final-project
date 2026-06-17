export function formatDateTime(value?: string | null) {
  if (!value) {
    return 'Chưa có';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

export function formatDate(value?: string | null) {
  if (!value) {
    return 'Chưa có';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
  }).format(date);
}

export function formatTime(value?: string | null) {
  if (!value) {
    return 'Chưa có';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('vi-VN', {
    timeStyle: 'short',
  }).format(date);
}

export function formatCurrency(value?: number | string | null) {
  if (value === undefined || value === null || value === '') {
    return '0';
  }

  const amount = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(amount)) {
    return String(value);
  }

  return new Intl.NumberFormat('vi-VN').format(amount);
}
