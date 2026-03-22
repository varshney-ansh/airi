function InfoRow({ label, value, last }) {
  return (
    <tr className={!last ? "border-b border-text-muted" : ""}>
      <td className="px-6 py-4 text-text-secondary whitespace-nowrap">
        {label}
      </td>
      <td className="px-6 py-4 w-full">
        {value}
      </td>
    </tr>
  );
}

export default InfoRow