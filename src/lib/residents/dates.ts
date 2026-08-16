export function isOnOrAfter(date: string, baseline: string) {
  return date >= baseline;
}

export function validateTransferDate(assignmentStart: string, transferDate: string) {
  if (!isOnOrAfter(transferDate, assignmentStart)) {
    return "Transfer date can't be before the current stay started.";
  }
  return null;
}

export function validateCheckoutDate(assignmentStart: string, checkoutDate: string) {
  if (!isOnOrAfter(checkoutDate, assignmentStart)) {
    return "Checkout date can't be before the current stay started.";
  }
  return null;
}

export function validateNoticeDate(assignmentStart: string, noticeDate: string) {
  if (!isOnOrAfter(noticeDate, assignmentStart)) {
    return "Notice date can't be before the current stay started.";
  }
  return null;
}
