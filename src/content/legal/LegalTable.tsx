/**
 * Data table inside a long-form legal document. Wide tables scroll sideways inside their own region on narrow
 * screens, so the page itself never scrolls horizontally; the region is focusable for keyboard scrolling.
 */
export function LegalTable({ label, head, children }: { label: string; head: string[]; children: React.ReactNode }) {
  return (
    <div role="region" aria-label={label} tabIndex={0} className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <table
        className="w-full border-collapse text-left text-[15px] leading-normal [&_td]:border-b [&_td]:border-line [&_td]:py-2.5 [&_td]:pr-4 [&_td]:align-top"
        style={head.length > 2 ? { minWidth: head.length * 150 } : undefined}
      >
        <thead>
          <tr>
            {head.map((cell) => (
              <th key={cell} scope="col" className="border-b-2 border-line py-2 pr-4 align-bottom font-semibold text-ink">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
