"use client";

import { Icon } from "../Icon";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="btn-outline self-start print:hidden">
      <Icon name="list" className="h-4 w-4" /> Print
    </button>
  );
}
