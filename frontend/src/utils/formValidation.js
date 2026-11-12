const INVALID_FIELD_CLASSES = ["!border-red-500", "!ring-2", "!ring-red-200"];

export function focusInvalidField(control) {
  if (!control) return;
  control.classList.add(...INVALID_FIELD_CLASSES);
  control.scrollIntoView({ behavior: "smooth", block: "center" });
  control.focus({ preventScroll: true });
}

export function focusFirstInvalidField(form) {
  if (!form) return false;
  const control = Array.from(form.elements).find(
    (element) => element.willValidate && !element.validity.valid,
  );
  if (!control) return false;
  focusInvalidField(control);
  return true;
}

export function clearInvalidFieldHighlight(event) {
  const control = event.target;
  if (control.willValidate && control.validity.valid) {
    control.classList.remove(...INVALID_FIELD_CLASSES);
  }
}
