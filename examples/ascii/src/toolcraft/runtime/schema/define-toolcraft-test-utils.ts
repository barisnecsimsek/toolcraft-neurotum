import { defineToolcraft } from "./define-toolcraft";

export function createSliderControls(count: number) {
  return Object.fromEntries(
    Array.from({ length: count }, (_, index) => [
      `control${index}`,
      {
        defaultValue: index,
        target: `values.control${index}`,
        type: "slider",
      },
    ]),
  );
}

export function getProductSections(app: ReturnType<typeof defineToolcraft>) {
  return app.panels.controls?.sections.filter((section) => section.title !== "Setup") ?? [];
}
