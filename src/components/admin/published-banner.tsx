export function PublishedBanner({ version }: { version?: string }) {
  if (!version) return null;
  return (
    <p className="mb-6 rounded-md border border-moss-700/30 bg-moss-100 px-4 py-3 text-sm text-moss-700">
      Version {version} is now live for all installations.
    </p>
  );
}
