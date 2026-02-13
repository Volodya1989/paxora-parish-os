import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { withI18n } from "@/tests/utils/i18n";
import { loadModuleFromRoot } from "@/tests/_helpers/load-module";

mock.module("next/navigation", {
  namedExports: {
    useRouter: () => ({ push: () => undefined }),
    useSearchParams: () => new URLSearchParams()
  }
});

test("TaskFilters hides ownership when showOwnership is false", async () => {
  const loadedModule = await loadModuleFromRoot<any>("components/tasks/TaskFilters");
  const TaskFilters = loadedModule.default ?? loadedModule;

  const markup = renderToStaticMarkup(
    withI18n(
      createElement(TaskFilters, {
        filters: { status: "all", ownership: "mine", groupId: undefined, query: undefined },
        groupOptions: [],
        showOwnership: false,
        layout: "stacked"
      })
    )
  );

  assert.doesNotMatch(markup, /Ownership/i);
});


test("TaskFilters hides group filter when showGroup is false", async () => {
  const loadedModule = await loadModuleFromRoot<any>("components/tasks/TaskFilters");
  const TaskFilters = loadedModule.default ?? loadedModule;

  const markup = renderToStaticMarkup(
    withI18n(
      createElement(TaskFilters, {
        filters: { status: "all", ownership: "mine", groupId: undefined, query: undefined },
        groupOptions: [{ id: "g1", name: "Group 1" }],
        showGroup: false,
        layout: "stacked"
      })
    )
  );

  assert.doesNotMatch(markup, /Group/i);
});
