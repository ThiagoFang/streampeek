function formatViewerCount(count: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(
    count,
  );
}

export { formatViewerCount };
