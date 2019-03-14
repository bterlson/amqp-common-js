// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

// Shim for DOM's window
interface Window { }
declare var window: Window;

// Shim for DOM's WebSocket
interface WebSocket { }
declare var WebSocket: {
  prototype: WebSocket;
  new(url: string, protocols?: string | string[]): WebSocket;
  readonly CLOSED: number;
  readonly CLOSING: number;
  readonly CONNECTING: number;
  readonly OPEN: number;
};