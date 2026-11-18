// Sample for hardcodedStrings.test.ts: each line below must be reported.
// Lives under __tests__, so the real scan skips it.
declare const Field: (props: { label: string; heading?: string }) => null;
declare const setError: (message: string) => void;

export function Sample() {
  setError("Something went wrong");
  return (
    <>
      <Field label="Save the preset" heading="Your history" />
      <button aria-label={"Close the sheet"} />
    </>
  );
}
