const toValidDate = (value) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value?.toDate === 'function') {
    const converted = value.toDate();
    return converted instanceof Date && !Number.isNaN(converted.getTime()) ? converted : null;
  }

  if (typeof value === 'object') {
    const seconds = value.seconds ?? value._seconds;
    const nanoseconds = value.nanoseconds ?? value._nanoseconds ?? 0;

    if (typeof seconds === 'number') {
      const millis = seconds * 1000 + Math.floor(nanoseconds / 1000000);
      const converted = new Date(millis);
      return Number.isNaN(converted.getTime()) ? null : converted;
    }
  }

  const converted = new Date(value);
  return Number.isNaN(converted.getTime()) ? null : converted;
};

export const formatSafeDate = (value, fallback = 'Date unavailable', locale = undefined) => {
  const date = toValidDate(value);
  if (!date) {
    return fallback;
  }

  return date.toLocaleDateString(locale);
};

export const formatSafeDateTime = (value, fallback = 'Date unavailable', locale = undefined) => {
  const date = toValidDate(value);
  if (!date) {
    return fallback;
  }

  return date.toLocaleString(locale);
};

export { toValidDate };
