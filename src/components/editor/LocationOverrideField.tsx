import { OverrideField } from './OverrideField';

export function LocationOverrideField() {
  return (
    <OverrideField
      fieldKey="location"
      label="Location"
      labelId="location-override-label"
      emptyPlaceholder="e.g. Tokyo, Asakusa"
      description="Add the place where the photo was taken. Shown on the Caption, Glass, and Compact templates. Falls back to IPTC location tags if present."
    />
  );
}
