export function formDataToRecord(formData: FormData): Record<string, string> {
  const record: Record<string, string> = {};
  formData.forEach((value, key) => {
    record[key] = String(value);
  });
  return record;
}

export function recordToFormData(record: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(record)) {
    formData.append(key, value);
  }
  return formData;
}
