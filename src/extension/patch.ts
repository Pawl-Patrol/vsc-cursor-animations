import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

/**
 * Inspired by code from here:
 * https://github.com/be5invis/vscode-custom-css/blob/master/src/extension.js
 */

export async function patchHtmlFile(scriptFile: string) {
  const htmlFile = resolveHtmlFile();

  // backup
  await restoreBackupIfExists(htmlFile);
  await createBackup(htmlFile);

  // patch
  const script = await fs.promises.readFile(scriptFile, "utf8");
  await injectHtml(htmlFile, script);

  needsRestart();
}

export async function revertChanges() {
  const htmlFile = resolveHtmlFile();
  await restoreBackupIfExists(htmlFile);
}

async function injectHtml(htmlFile: string, script: string) {
  let html = await fs.promises.readFile(htmlFile, "utf8");
  html = html.replace(
    /<meta\s+http-equiv="Content-Security-Policy"[\s\S]*?\/>/,
    ""
  );
  html = html.replace(/(<\/html>)/, `<script>${script}</script>\n</html>`);
  await fs.promises.writeFile(htmlFile, html, "utf8");
}

function resolveHtmlFile() {
  for (const possiblePath of possiblePaths) {
    if (fs.existsSync(possiblePath)) {
      return possiblePath;
    }
  }

  throw new Error("Unable to locate workbench.html file.");
}

async function createBackup(htmlFile: string) {
  try {
    const html = await fs.promises.readFile(htmlFile, "utf8");
    await fs.promises.writeFile(backupName(htmlFile), html, "utf8");
  } catch (e) {
    vscode.window.showErrorMessage("Need admin privilege to patch html file.");
    throw e;
  }
}

async function restoreBackupIfExists(htmlFile: string) {
  try {
    if (fs.existsSync(backupName(htmlFile))) {
      await fs.promises.unlink(htmlFile);
      await fs.promises.rename(backupName(htmlFile), htmlFile);
    }
  } catch (e) {
    vscode.window.showErrorMessage("Need admin privilege to patch html file.");
    throw e;
  }
}

function needsRestart() {
  vscode.window
    .showInformationMessage("Restart your IDE to apply changes", "Restart")
    .then((btn) => {
      if (btn === "Restart") {
        vscode.commands.executeCommand("workbench.action.reloadWindow");
      }
    });
}

// prettier-ignore
const possiblePaths = [
  path.join(vscode.env.appRoot, "out", "vs", "code", "electron-sandbox", "workbench", "workbench.html"),
  path.join(vscode.env.appRoot, "out", "vs", "code", "electron-sandbox", "workbench", "workbench-apc-extension.html"),
  path.join(vscode.env.appRoot, "out", "vs", "code", "electron-sandbox", "workbench", "workbench.esm.html"),
];

const backupName = (file: string) => `${file}.backup`;
