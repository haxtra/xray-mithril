# xray-mithril

JavaScript object browser for Mithril.js

[Live demo](https://xray.haxtra.com)

![Screenshot](https://media.haxtra.com/xray.png)


## Install

	$ npm i xray-mithril


## Usage

Basic

	m(XRay, {obj:myObj})

Disable header

	m(XRay, {obj:myObj, header:false})

Set custom title

	m(XRay, {obj:myObj, title:"My title"})

Start minimized

	m(XRay, {obj:myObj, minimize:true})

Collapse some keys

	m(XRay, {obj:myObj, collapse:["key1", "key2"]})
	// collapse nested keys
	m(XRay, {obj:myObj, collapse:["key1.sub1", "key2.sub2"]})

Collapse all top level keys

	m(XRay, {obj:myObj, collapse:"top"})

Collapse everything

	m(XRay, {obj:myObj, collapse:true})

Collapse everything except

	m(XRay, {obj:myObj, collapseExcept:["key1", "key2"]})

Include footer with node count

	m(XRay, {obj:myObj, count:true})


## Interaction

Clickable areas:

- header title -- show/hide XRay panel
- property -- toggle display of value/subtree
- property : right click -- prompt with path to property
- unknown values -- log undetected object to console


## Caveats

- invisible characters in strings like newline are not displayed
- proxies are not detected, displayed as standard object
- promise status is not detected


## Other ports

- [xray-react](https://github.com/haxtra/xray-react)
- [xray-solid](https://github.com/haxtra/xray-solid)
- [xray-svelte](https://github.com/haxtra/xray-svelte)
- [xray-vue](https://github.com/haxtra/xray-vue)


## License

MIT

![](https://hello.haxtra.com/gh-xray-mithril)
