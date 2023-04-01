class XRayCircularChecker {
	constructor() {
		this.seen = new WeakMap()
	}

	check(obj, path) {

		const paths = this.seen.get(obj)

		if(!paths){
			// first time seen, just add
			this.seen.set(obj, [path])
			return false
		}

		for(const seen of paths){

			if(seen === path)
				// same as before, this is rerender
				return false

			if(path.startsWith(seen) && path.startsWith(seen+'.'))
				// path is descendant, this is circular
				return true
		}

		// not same, not parent, different location
		paths.push(path)

		return false
	}
}

const XRay = function(){

	return {

		state: {
			header: true,
			title: null,
			minimized: false,
			collapsed: {},
			collapseReversed: false,

			seen: null,

			count: false,
			nodeCount: 0,
		},

		oninit(vnode) {

			// header
			this.state.header = !(vnode.attrs.header === false)

			// title
			this.state.title = vnode.attrs.title || 'XRay'

			// minimize
			this.state.minimized = !!vnode.attrs.minimize

			// collapse
			if(vnode.attrs.collapse){
				if(vnode.attrs.collapse == 'top'){
					for(const key in vnode.attrs.obj)
						this.state.collapsed['.'+key] = true
				} else if(Array.isArray(vnode.attrs.collapse)){
					for(const key of vnode.attrs.collapse)
						this.state.collapsed['.'+key] = true
				} else if(vnode.attrs.collapse === true){
					this.state.collapseReversed = true
				} else {
					console.error('XRay invalid param :collapse: must be true or array')
				}
			}

			// collapse except
			if(vnode.attrs.collapseExcept){
				for(const key in vnode.attrs.obj)
					if(!vnode.attrs.collapseExcept.includes(key))
						this.state.collapsed['.'+key] = true
			}

			// node count
			if(vnode.attrs.count){
				this.state.count = true
			}
		},

		view: function(vnode){

			this.state.seen = new XRayCircularChecker()
			this.state.nodeCount = 0

			const time = Date.now()

			return m('div.XRay', {oncontextmenu:this.promptPath}, [
				this.header(),
				!this.state.minimized && m('div.xrContent', [
					this.value(vnode.attrs.obj, '$'),
					this.state.count && m('div.xrCounts', `${this.state.nodeCount} nodes · ${Date.now() - time}ms`),
				]),
			])
		},

		header: function(){

			if(!this.state.header)
				return null

			return m('div.xrHeader' + (this.state.minimized ? '.xrMinimized' : ''), [
				m('div.xrTitle', {onclick:()=>this.state.minimized = !this.state.minimized}, this.state.title),
			])
		},

		value: function(obj, path){

			if((typeof obj == 'object' || typeof obj == 'function') && obj != null){
				if(this.state.seen.check(obj, path))
					return this.special('CircularReference')
			}

			this.state.nodeCount++

			switch(typeof(obj)){
				case 'object':
					const objType = Object.prototype.toString.call(obj)
					switch(objType){
						case '[object Object]':
							// plain object or instance of a function/class
							if(obj.constructor.name == 'Object')
								return this.object(obj, path)
							else
								return this.instance(obj, path)
						case '[object Array]':
							return this.array(obj, path)
						case '[object Null]':
							return m('span.xrNull', 'null')
						case '[object Date]':
							return this.special('Date', obj.toString())
						case '[object RegExp]':
							return this.special('RegExp', obj.toString())
						case '[object Error]':
							return this.special('Error', obj.toString())
						case '[object Promise]':
							return this.special('Promise')
						case '[object Map]':
								return this.map(obj, path)
						case '[object Set]':
							return this.set(obj, path)
						case '[object WeakMap]':
							return this.special('WeakMap')
						case '[object WeakSet]':
							return this.special('WeakSet')
						case '[object Storage]':
							return this.instance(obj, path)
						case '[object Int8Array]':
						case '[object Uint8Array]':
						case '[object Uint8ClampedArray]':
						case '[object Int16Array]':
						case '[object Uint16Array]':
						case '[object Int32Array]':
						case '[object Uint32Array]':
						case '[object Float32Array]':
						case '[object Float64Array]':
						case '[object BigInt64Array]':
						case '[object BigUint64Array]':
						case '[object ArrayBuffer]':
							const arrType = (/\[object (\w+)\]/.exec(objType))[1]
							return this.dumper(arrType, 'SuperArray', obj)
						case '[object Math]':
							return this.function(obj)
						default:
							return this.unknown(obj)
					}
				case 'string':
					if(obj === "")
						return m('span.xrString.xrEmpty', '')
					else
						return m('span.xrString', obj)
				case 'number':
					return m('span.xrNumeric', obj)
				case 'boolean':
					return m('span.xrBool', obj.toString())
				case 'undefined':
					return m('span.xrNull', 'undefined')
				case 'function':
					return this.function(obj, path)
				// rares
				case 'bigint':
					return m('span.xrNumeric', [m('span.xrLabel','BigInt'), obj])
				case 'symbol':
					return this.special('Symbol', obj.description)
				default:
					return this.unknown(obj)
			}
		},

		array: function(obj, path){

			if(!obj.length)
				return m('span.xrArray.xrEmpty', '')

			return m('table', obj.map( (o, i) => {
				// const subpath = path + '.' + i
				const subpath = `${path}[${i}]`

				if(this.isCollapsed(subpath))
					return m('tr.xrCollapsed', [
						m('td.xrKey.xrArray', {onclick:()=>this.toggleCollapse(subpath), title:subpath}, i),
						m('td.xrValue', ''),
					])
				else
					return m('tr', [
						m('td.xrKey.xrArray', {onclick:()=>this.toggleCollapse(subpath), title:subpath}, i),
						m('td', this.value(o, subpath)),
					])
			}))
		},

		object: function(obj, path){

			const keys = Object.keys(obj)

			if(!keys.length)
				return m('span.xrObject.xrEmpty', '')

			return m('table', keys.map( key => {
				const subpath = path + '.' + key

				if(this.isCollapsed(subpath))
					return m('tr.xrCollapsed', [
						m('td.xrKey', {onclick: ()=>this.toggleCollapse(subpath), title:subpath}, key),
						m('td.xrValue', ''),
					])
				else
					return m('tr', [
						m('td.xrKey', {onclick: ()=>this.toggleCollapse(subpath), title:subpath}, key),
						m('td', this.value(obj[key], subpath)),
					])
			}))
		},

		set: function(obj, path){

			if(!obj.size)
				return m('div', [
						m('span.xrLabel', 'Set'),
						m('span.xrArray.xrEmpty', '')
					])

			const rows = []
			for(const val of obj)
				rows.push(m('tr', m('td', this.value(val, path))))

			return m('div', [
				m('span.xrLabel', 'Set'),
				m('table', rows)
			])
		},

		map: function(obj, path){

			if(!obj.size)
				return m('div', [
						m('span.xrLabel', 'Map'),
						m('span.xrObject.xrEmpty', '')
					])

			const rows = []
			for(const entries of obj){

				const subpath = path + '.' + entries[0].toString()

				if(this.isCollapsed(subpath))
					rows.push(m('tr.xrCollapsed', [
						m('td.xrKey', {onclick: ()=>this.toggleCollapse(subpath)}, entries[0].toString()),
						m('td.xrValue', ''),
					]))
				else
					rows.push(m('tr', [
						m('td.xrKey', {onclick: ()=>this.toggleCollapse(subpath)}, entries[0].toString()),
						m('td', this.value(entries[1])),
					]))
			}

			return m('div', [
				m('span.xrLabel', 'Map'),
				m('table', rows)
			])
		},

		function: function(obj, path){

			const keys = this.functionSniffer(obj)

			const rows = []
			for(const key of keys){

				const subpath = path + '.' + key

				if(this.isCollapsed(subpath))
					rows.push(
						m('tr.xrCollapsed', [
							m('td.xrKey', {onclick:()=>this.toggleCollapse(subpath), title:subpath}, key),
							m('td.xrValue', ''),
						])
					)
				else
					rows.push(
						m('tr', [
							m('td.xrKey', {onclick:()=>this.toggleCollapse(subpath), title:subpath}, key),
							m('td', this.value(obj[key], subpath)),
						])
					)
			}

			const objType = Object.prototype.toString.call(obj)
			const fnType = (/\[object (\w+)\]/.exec(objType))[1]
			const fnName = obj.name ? obj.name : '[Anonymous]'

			return keys.length
				? m('div', [
						m('span.xrFunction', fnType + ' ' + fnName),
						m('table', rows)
					])
				: m('span.xrFunction', fnType + ' ' + fnName)
		},

		instance: function(obj, path){

			const keys = this.instanceSniffer(obj)

			const rows = []
			for(const key of keys){

				const subpath = path + '.' + key

				if(this.isCollapsed(subpath))
					rows.push(
						m('tr.xrCollapsed', [
							m('td.xrKey', {onclick:()=>this.toggleCollapse(subpath), title:subpath}, key),
							m('td.xrValue', ''),
						])
					)
				else
					rows.push(
						m('tr', [
							m('td.xrKey', {onclick:()=>this.toggleCollapse(subpath), title:subpath}, key),
							m('td', this.value(obj[key], subpath)),
						])
					)
			}

			return m('div', [
				m('span.xrLabel.xrInstance', (obj.constructor.name || 'anonymous') + ' instance'),
				rows.length ? m('table', rows) : null
			])
		},

		special: function(type, string, label){
			return m('div.xr' + type, [
				m('span.xrLabel', label || type),
				string
			])
		},

		dumper: function(label, type, obj){
			// for recognized, but unsupported objects, show label and dump to console on click
			return m('div', {onclick:()=>console.log(obj)}, m('span.xrLabel.xr'+type, label))
		},

		unknown: function(obj){

			let text;
			try {
				text = obj.toString()
			} catch {
				text = 'unknown'
			}

			return m('span.xrUnknown', {onclick:()=>console.log(obj)}, [
				m('span.xrLabel', '?'),
				text
				]
			)
		},

		functionSniffer: function(obj){
			// check for attached properties to function object

			const names = Object.getOwnPropertyNames(obj)

			// filter out native props
			for(const name of this._functionNativeProps){
				const idx = names.indexOf(name)
				if(idx > -1)
					names.splice(idx, 1)
			}

			return names
		},
		_functionNativeProps: ['length', 'name', 'arguments', 'caller', 'prototype'],

		instanceSniffer: function(obj){
			// return all properties and methods of the object, except the base one

			// get props, these are all available in topmost object
			const properties = Object.getOwnPropertyNames(obj)

			// collect class methods recursively
			const methodSet = []
			let parent = Object.getPrototypeOf(obj)

			while(true) {

				// bail out if base class is reached
				if(parent.constructor.name == 'Object')
					break;

				// gather methods of current object
				methodSet.push(Object.getOwnPropertyNames(parent))

				// get parent class
				parent = Object.getPrototypeOf(parent.constructor.prototype)
			}

			// flatten, reverse (so methods are listed in class extension order), and remove dupes
			const methods = [...new Set([].concat(...(methodSet.reverse())))]

			// merge with props and serve hot
			return properties.concat(methods)
		},

		isCollapsed(path) {
			if(this.state.collapseReversed){
				return !this.state.collapsed[path]
			}
			else
				return this.state.collapsed[path]
		},

		toggleCollapse(path) {
			if(this.state.collapsed[path])
				delete this.state.collapsed[path]
			else
				this.state.collapsed[path] = true
		},

		promptPath(e) {
			const title = e.target.title
			if(title) {
				e.preventDefault()
				e.stopPropagation()
				prompt('Object path:', title)
			}
		},
	}
}
