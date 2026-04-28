import UiCardRefactorClient from "./ui-card-refactor-client";

type PreviewCustomer = {
  id: string;
  name: string;
  iconUrl: string | null;
  icon: string;
  source: "mock";
};

const MOCK_CUSTOMERS: PreviewCustomer[] = [
  { id: "c1", name: "たかし", icon: "👨🏻", iconUrl: null, source: "mock" },
  { id: "c2", name: "ゆうすけ", icon: "👨🏼", iconUrl: null, source: "mock" },
  { id: "c3", name: "まなみ", icon: "👩🏽", iconUrl: null, source: "mock" },
  { id: "c4", name: "あや", icon: "👩🏻", iconUrl: null, source: "mock" },
];

export default function UiCardRefactorPage() {
  return <UiCardRefactorClient customers={MOCK_CUSTOMERS} />;
}
