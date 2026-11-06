interface SeriesLegendProps {
  /** Shown as a third entry when there is a daily limit */
  goalLimit?: number | null;
}

/** Key for any chart of the two series, with the limit drawn as the line it is in the plot. */
export const SeriesLegend = ({ goalLimit }: SeriesLegendProps) => (
  <ul className="flex gap-2.5 text-sm text-muted-foreground">
    <li className="flex items-center gap-1.5">
      <span aria-hidden="true" className="w-2 h-2 rounded-[3px] bg-tobacco" />
      Tabaco
    </li>
    <li className="flex items-center gap-1.5">
      <span aria-hidden="true" className="w-2 h-2 rounded-[3px] bg-cannabis" />
      Cannabis
    </li>
    {goalLimit != null && (
      <li className="flex items-center gap-1.5">
        <span aria-hidden="true" className="w-3 h-px bg-foreground/60" />
        meta {goalLimit}
      </li>
    )}
  </ul>
);
