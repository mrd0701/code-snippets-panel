import * as vscode from 'vscode';
import { getNonce } from './utils';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
  const provider = new SnippetsPanelProvider(context.extensionUri, context);

  // Регистрируем команду для открытия панели
  context.subscriptions.push(
    vscode.commands.registerCommand('codeSnippets.openPanel', () => {
      provider.openPanel();
    })
  );

  // 🟢 Добавляем кнопку в нижнюю панель (status bar)
  const button = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  button.text = '$(notebook-template) Сниппеты';
  button.tooltip = 'Открыть панель Code Snippets';
  button.command = 'codeSnippets.openPanel';
  button.show();

  context.subscriptions.push(button);
}

class SnippetsPanelProvider {
  private panel: vscode.WebviewPanel | undefined;
  constructor(private readonly extensionUri: vscode.Uri, private readonly context: vscode.ExtensionContext) {}

  public openPanel() {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.Beside);
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'codeSnippetsPanel',
      'Code Snippets',
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'media')],
      }
    );

    this.panel.iconPath = vscode.Uri.joinPath(this.extensionUri, 'media', 'icon.svg');
    this.panel.webview.html = this.getHtmlForWebview(this.panel.webview);

    this.panel.onDidDispose(() => {
      this.panel = undefined;
    });

    this.panel.webview.onDidReceiveMessage(async (msg) => {
      switch (msg.command) {
        case 'load':
          this.panel?.webview.postMessage({
            command: 'loaded',
            items: this.context.globalState.get('snippets', []),
          });
          break;

        case 'save':
          await this.context.globalState.update('snippets', msg.items ?? []);
          this.panel?.webview.postMessage({ command: 'saved' });
          break;

        case 'copy':
          await vscode.env.clipboard.writeText(msg.text);
          break;

        case 'pasteFromClipboard':
          const clip = await vscode.env.clipboard.readText();
          this.panel?.webview.postMessage({ command: 'pasted', text: clip });
          break;
      }
    });
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    const nonce = getNonce();
    const htmlPath = path.join(this.extensionUri.fsPath, 'src', 'panel', 'webview.html');
    let html = fs.readFileSync(htmlPath, 'utf8');
    html = html.replace(/%NONCE%/g, nonce);
    return html;
  }
}

export function deactivate() {}
