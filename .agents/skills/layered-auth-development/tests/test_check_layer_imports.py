import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(SCRIPT_DIR))

from check_layer_imports import check_project, relative_imports


class LayerBoundaryCheckerTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        for layer in ("ui", "app", "domain", "infra/client", "infra/server"):
            (self.root / "src" / layer).mkdir(parents=True, exist_ok=True)
        self.write("src/domain/policy.ts", "export type Policy = string;\n")
        self.write("src/app/ports/client.ts", "export interface ClientPort {}\n")
        self.write("src/app/auth-client.ts", "export interface AuthClient {}\n")
        self.write("src/app/use-case.ts", 'import type { Policy } from "../domain/policy";\n')
        self.write("src/ui/view.tsx", 'import type { UseCase } from "../app/use-case";\n')
        self.write("src/infra/client/http.ts", 'import type { ClientPort } from "../../app/ports/client";\n')
        self.write("src/infra/server/route.ts", 'import { run } from "../../app/use-case";\n')
        self.write("src/main.tsx", 'import "./ui/view";\nimport "./infra/client/http";\n')

    def tearDown(self) -> None:
        self.temp.cleanup()

    def write(self, path: str, text: str) -> None:
        file_path = self.root / path
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_text(text, encoding="utf-8")

    def test_allowed_layer_direction_type_import_and_client_composition(self) -> None:
        checked, issues = check_project(self.root)
        self.assertGreater(checked, 0)
        self.assertEqual(issues, [])

    def test_same_layer_ui_app_and_domain_imports_are_allowed(self) -> None:
        self.write("src/ui/helper.ts", 'import type { View } from "./view";\n')
        self.write("src/app/helper.ts", 'import type { UseCase } from "./use-case";\n')
        self.write("src/domain/derived.ts", 'import type { Policy } from "./policy";\n')
        _, issues = check_project(self.root)
        self.assertEqual(issues, [])

    def test_type_reexport_dynamic_and_require_are_checked(self) -> None:
        self.write(
            "src/domain/bad.ts",
            'export type { View } from "../ui/view";\n'
            'const lazy = import("../app/use-case");\n'
            'const common = require("../infra/server/route");\n',
        )
        _, issues = check_project(self.root)
        self.assertEqual(
            [issue.specifier for issue in issues],
            ["../ui/view", "../app/use-case", "../infra/server/route"],
        )

    def test_ui_server_and_non_composition_client_imports_are_rejected(self) -> None:
        self.write("src/ui/bad.ts", 'import type { Env } from "../infra/server/env";\n')
        self.write("src/ui/api.ts", 'import { api } from "../infra/client/http";\n')
        _, issues = check_project(self.root)
        self.assertEqual(
            {issue.specifier for issue in issues},
            {"../infra/server/env", "../infra/client/http"},
        )

    def test_named_ui_composition_may_wire_client_adapter(self) -> None:
        self.write("src/ui/composition.ts", 'import { api } from "../infra/client/http";\n')
        _, issues = check_project(self.root)
        self.assertEqual(issues, [])

    def test_client_adapter_may_import_app_auth_client_and_ports(self) -> None:
        self.write("src/infra/client/auth-api.ts", 'import type { AuthClient } from "../../app/auth-client";\n')
        _, issues = check_project(self.root)
        self.assertEqual(issues, [])

    def test_client_adapter_may_not_import_app_use_case(self) -> None:
        self.write("src/infra/client/bad.ts", 'import { useCase } from "../../app/use-case";\n')
        _, issues = check_project(self.root)
        self.assertEqual([issue.specifier for issue in issues], ["../../app/use-case"])

    def test_server_and_client_infra_cannot_import_each_other(self) -> None:
        self.write("src/infra/server/bad.ts", 'import { client } from "../client/http";\n')
        self.write("src/infra/client/bad.ts", 'import { route } from "../server/route";\n')
        _, issues = check_project(self.root)
        self.assertEqual(
            {(issue.path, issue.specifier) for issue in issues},
            {
                ("infra/server/bad.ts", "../client/http"),
                ("infra/client/bad.ts", "../server/route"),
            },
        )

    def test_multiline_type_import_is_found(self) -> None:
        found = relative_imports('import type {\n  Policy,\n} from "../infra/server/policy";\n')
        self.assertEqual([specifier for specifier, _ in found], ["../infra/server/policy"])

    def test_test_files_and_css_assets_are_excluded(self) -> None:
        self.write("src/ui/__tests__/view.test.tsx", 'import { secret } from "../../infra/server/secret";\n')
        self.write("src/domain/policy.spec.ts", 'import { ui } from "../ui/view";\n')
        self.write("src/main.tsx", 'import "./style.css";\n')
        _, issues = check_project(self.root)
        self.assertEqual(issues, [])

    def test_comment_removal_preserves_import_line_number(self) -> None:
        found = relative_imports(
            "/* first line\nsecond line\n*/\n"
            'import type { Policy } from "../domain/policy";\n'
        )
        self.assertEqual(found, [("../domain/policy", 4)])

    def test_missing_layer_sources_fail_closed(self) -> None:
        root = Path(self.temp.name) / "empty"
        (root / "src").mkdir(parents=True)
        (root / "src" / "main.tsx").write_text('import "./ui/view";\n', encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "no production source"):
            check_project(root)


if __name__ == "__main__":
    unittest.main()
