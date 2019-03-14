// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

// d.ts shims provide types for things we use internally but are not part
// of amqp-common's surface area.

// Shim for DOM's window
interface Window { }
declare var window: Window;