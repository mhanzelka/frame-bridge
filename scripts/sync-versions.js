import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const rootPkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const version = rootPkg.version;

const packages = [
    "packages/frame-bridge",
    "packages/react-frame-bridge",
    "packages/react-frame-bridge-devtools",
];

const scopedNames = packages.map(p => {
    const pkg = JSON.parse(readFileSync(resolve(root, p, "package.json"), "utf8"));
    return pkg.name;
});

for (const pkg of packages) {
    const pkgPath = resolve(root, pkg, "package.json");
    const pkgJson = JSON.parse(readFileSync(pkgPath, "utf8"));

    pkgJson.version = version;

    // Update inter-package dependency versions
    for (const depField of ["dependencies", "devDependencies", "peerDependencies"]) {
        if (!pkgJson[depField]) continue;
        for (const name of scopedNames) {
            if (pkgJson[depField][name]) {
                pkgJson[depField][name] = version;
            }
        }
    }

    writeFileSync(pkgPath, JSON.stringify(pkgJson, null, 4) + "\n");
    console.log(`Updated ${pkg}/package.json → ${version}`);
}

console.log(`\nAll packages synced to version ${version}`);
