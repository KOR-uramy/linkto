function parseDeveloperEmails(raw) {
  return (raw || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

const serverEmails = parseDeveloperEmails(
  process.env.DEVELOPER_EMAILS || process.env.NEXT_PUBLIC_DEVELOPER_EMAILS
);

const clientEmails = parseDeveloperEmails(
  process.env.NEXT_PUBLIC_DEVELOPER_EMAILS || process.env.DEVELOPER_EMAILS
);

export function isDeveloperUser(user, { server = false } = {}) {
  if (!user?.email) {
    return false;
  }

  const allowed = server ? serverEmails : clientEmails;
  return allowed.includes(user.email.trim().toLowerCase());
}
