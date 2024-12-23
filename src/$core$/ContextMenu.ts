// @ts-ignore
import styles from "./ContextMenu.scss?inline&compress";

// @ts-ignore
import html from "./ContextMenu.html?raw";

// @ts-ignore
import { getBoundingOrientRect } from "/externals/core/agate.js";

//
const preInit = URL.createObjectURL(new Blob([styles], {type: "text/css"}));

//
class UIContextMenuElement extends HTMLElement {
    #initialized: boolean = false;
    #themeStyle?: HTMLStyleElement;

    //
    #initialize() {
        if (!this.#initialized) {
            this.#initialized = true;
            this.dataset.hidden = "true";

            //
            const shadow = this.attachShadow({mode: 'open'});
            const parser = new DOMParser();
            const dom = parser.parseFromString(html, "text/html");

            //
            this.innerHTML = "";
            dom.querySelector("template")?.content?.childNodes.forEach(cp => {
                shadow.appendChild(cp.cloneNode(true));
            });

            //
            const style = document.createElement("style");
            style.innerHTML = `@import url("${preInit}");`;
            shadow.appendChild(style);

            //
            const weak = new WeakRef(this);

            // @ts-ignore
            const THEME_URL = "/externals/core/theme.js";
            import(/* @vite-ignore */ "" + `${THEME_URL}`).then((module)=>{
                // @ts-ignore
                this.#themeStyle = module?.default?.(this.shadowRoot);
                if (this.#themeStyle) { this.shadowRoot?.appendChild?.(this.#themeStyle); }
            }).catch(console.warn.bind(console));

            //
            if (!this.dataset.scheme) { this.dataset.scheme = "solid"; }
            if (!this.dataset.highlight) { this.dataset.highlight = "1"; }

            //
            this.style.zIndex = "99999";
        }
    }

    //
    constructor() { super(); }

    //
    connectedCallback() {
        this.#initialize();
    }
}

//
customElements.define("ui-contextmenu", UIContextMenuElement);

//
export default () => {};
export { UIContextMenuElement };

//
interface CTXMenuElement {
    icon: HTMLElement;
    content: string;
    callback: Function;
};

//
export const closeContextMenu = (ev?)=>{
    const ctxMenu = document.querySelector("ui-contextmenu") as HTMLElement;
    if (ctxMenu) { ctxMenu.dataset.hidden = "true"; };

    //
    document.documentElement.removeEventListener("contextmenu", ...evt);
    document.documentElement.removeEventListener("click", ...evt);
}

//
const hideOnClick = (ev?)=>{
    const t = ev.target as HTMLElement;
    const self = document.querySelector("ui-contextmenu") as HTMLElement;
    if (!((t?.closest("ui-contextmenu") == self) || (t == self)) || ev?.type == "click") {
        closeContextMenu(ev);
    };
}

//
const evt: [any, any] = [ hideOnClick, {} ];

// generateId :: Integer -> String
const generateId = (len = 16) => {
    var arr = new Uint8Array((len || 16) / 2);
    window.crypto.getRandomValues(arr);
    return Array.from(arr, (dec)=>dec.toString(16).padStart(2, "0")).join('')
}

//
export const openContextMenu = (event, content: CTXMenuElement[], toggle: boolean = false)=>{
    const initiator = event?.target;
    const ctxMenu   = document.querySelector("ui-contextmenu") as HTMLElement;

    //
    if (ctxMenu && (toggle && ctxMenu.dataset.hidden || !toggle)) {
        document.documentElement.addEventListener("contextmenu", ...evt);
        document.documentElement.addEventListener("click", ...evt);

        //
        if (initiator.matches("ui-dropmenu, .u2-dropmenu")) {
            const bbox = getBoundingOrientRect(initiator);
            ctxMenu.style.setProperty("--inline-size", `${bbox.width}`);
            ctxMenu.style.setProperty("--client-x", `${bbox.left}`);
            ctxMenu.style.setProperty("--client-y", `${bbox.bottom}`);

            //
            const initialAnchor = initiator?.style?.getPropertyValue?.("anchor-name");
            const ID = generateId();
            if (!initialAnchor || initialAnchor == "none") {
                initiator?.style?.setProperty?.("anchor-name", "--" + ID, "");
            }

            //
            ctxMenu.style.setProperty("--anchor-group", (initiator?.style?.getPropertyValue?.("anchor-name") || ("--" + ID)), "");
        } else {
            // TODO: better inline size
            // TODO: agate.UX pointer events support
            ctxMenu.style.setProperty("--inline-size", `8rem`);
            ctxMenu.style.setProperty("--client-x", event?.clientX || 0);
            ctxMenu.style.setProperty("--client-y", event?.clientY || 0);
            ctxMenu.style.setProperty("--page-x", event?.pageX || 0);
            ctxMenu.style.setProperty("--page-y", event?.pageY || 0);
        }

        //
        ctxMenu.innerHTML = "";
        content.map((el: CTXMenuElement)=>{
            const li = document.createElement("li");
            if (!li.dataset.highlightHover) { li.dataset.highlightHover = "1"; }

            //
            li.addEventListener("click", (e)=>{
                el.callback?.(initiator, {});
                closeContextMenu(event);
            });
            if (el.icon) {
                el.icon.remove?.();
                el.icon.style.setProperty("grid-column", "icon");
                li.append(el.icon);
            };
            li.insertAdjacentHTML("beforeend", `<span style="grid-column: content;">${el.content||""}</span>`);
            ctxMenu.append(li);
        });

        //
        delete ctxMenu.dataset.hidden;
    } else
    if (ctxMenu && toggle && !ctxMenu.dataset.hidden) {
        closeContextMenu(event);
    }
}

//
const OWNER = "contextmenu";

//
const setStyleURL = (base: [any, any], url: string)=>{
    //
    if (base[1] == "innerHTML") {
        base[0][base[1]] = `@import url("${url}");`;
    } else {
        base[0][base[1]] = url;
    }
}

//
const hash = async (string: string) => {
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(string));
    return "sha256-" + btoa(String.fromCharCode.apply(null, new Uint8Array(hashBuffer) as unknown as number[]));
}

//
const loadStyleSheet = async (inline: string, base?: [any, any], integrity?: string|Promise<string>)=>{
    const url = URL.canParse(inline) ? inline : URL.createObjectURL(new Blob([inline], {type: "text/css"}));
    if (base?.[0] && (!URL.canParse(inline) || integrity) && base?.[0] instanceof HTMLLinkElement) {
        const I: any = (integrity ?? hash(inline));
        if (typeof I?.then == "function") {
            I?.then?.((H)=>base?.[0]?.setAttribute?.("integrity", H));
        } else {
            base?.[0]?.setAttribute?.("integrity", I as string);
        }
    }
    if (base) setStyleURL(base, url);
}

//
const INTEGRITY = hash(styles);

//
const loadBlobStyle = (inline: string)=>{
    const style = document.createElement("link");
    style.rel = "stylesheet";
    style.type = "text/css";
    style.crossOrigin = "same-origin";
    style.dataset.owner = OWNER;
    loadStyleSheet(inline, [style, "href"]);
    document.head.appendChild(style);
    return style;
}

//
const loadInlineStyle = (inline: string, rootElement = document.head, integrity?: string|Promise<string>)=>{
    const PLACE = (rootElement.querySelector("head") ?? rootElement);
    if (PLACE instanceof HTMLHeadElement) { loadBlobStyle(inline); }

    //
    const style = document.createElement("style");
    style.dataset.owner = OWNER;
    loadStyleSheet(inline, [style, "innerHTML"], integrity);
    PLACE.appendChild(style);
}

//
loadInlineStyle(preInit, document.head, INTEGRITY);
