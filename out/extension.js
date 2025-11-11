"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const utils_1 = require("./utils");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
function activate(context) {
    const provider = new SnippetsPanelProvider(context.extensionUri, context);
    // Регистрируем команду для открытия панели
    context.subscriptions.push(vscode.commands.registerCommand('codeSnippets.openPanel', () => {
        provider.openPanel();
    }));
    // 🟢 Добавляем кнопку в нижнюю панель (status bar)
    const button = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    button.text = '$(notebook-template) Сниппеты';
    button.tooltip = 'Открыть панель Code Snippets';
    button.command = 'codeSnippets.openPanel';
    button.show();
    context.subscriptions.push(button);
}
class SnippetsPanelProvider {
    constructor(extensionUri, context) {
        this.extensionUri = extensionUri;
        this.context = context;
    }
    openPanel() {
        if (this.panel) {
            this.panel.reveal(vscode.ViewColumn.Beside);
            return;
        }
        this.panel = vscode.window.createWebviewPanel('codeSnippetsPanel', 'Code Snippets', { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true }, {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'media')],
        });
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
    getHtmlForWebview(webview) {
        const nonce = (0, utils_1.getNonce)();
        const htmlPath = path.join(this.extensionUri.fsPath, 'src', 'panel', 'webview.html');
        let html = fs.readFileSync(htmlPath, 'utf8');
        html = html.replace(/%NONCE%/g, nonce);
        return html;
    }
}
function deactivate() { }
//# sourceMappingURL=extension.js.map