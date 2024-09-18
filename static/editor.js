/*
.---------------------------------------------------.
|   BASED ON CHRISTIAN BEHLERS ORIGINAL EDITOR      |
|    THE FOLLOWING SOFTWARE CONTAINS SIGNIFICANT    |
| PORTIONS OF THE ORIGINAL WORK OF CHRISTIAN BEHLER |
|---------------------------------------------------|
|           LAST IS THE ORIGINAL LICENSE            |
'---------------------------------------------------'

MIT License

Copyright (c) 2024 Silas Pockendahl (kstg.dk)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

-------------------------------------------

Copyright 2023 Christian Behler (pingpoli.de)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

*/
class Editor {

	targetElement = null
	#mutationObserver
	#layoutKey = Symbol()
	#elKey = Symbol()
	#editableElements = new Set()
	#decorators = new Set()
	#container

	constructor(cfg, container = document.body) {
		this.#container = container
		this.cfg = cfg
		for (let key in cfg.layout) {
			cfg.layout[key].name = key.toUpperCase()
		}
		this.targetElement = null
		/* document.addEventListener("unfocus", async () => {
			this.clean()
			this.#undecorate()
		}) */
		addEventListener("paste", this.#handlePaste.bind(this))
		addEventListener("click", this.#handleClick.bind(this))
		this.#mutationObserver = new MutationObserver((records) => {
			this.#makeEditable(container)
			this.#findLayoutElements(container)
			this.#redecorate()
			if (this.onChange) this.onChange()
		})
	}

	get isInit() { return this.#isInit }
	#isInit = false
	setup() {
		if (!this.#isInit) {
			this.#makeEditable(this.#container)
			this.#findLayoutElements(this.#container)
			for (let el of this.#editableElements) {
				this.#mutationObserver.observe(el, {"subtree": true, "childList": true})
			}
			this.#isInit = true
		}
	}

	getDiff() {
		let out = []
		let map = new Map()
		let els = this.#getRootEditables()
		// tmp remove attributes from src
		for (let el of this.#container.querySelectorAll("[contenteditable]")) {
			map.set(el, el.contentEditable)
			el.removeAttribute("contenteditable")
		}
		for (let el of els) {
			if (el[this.#elKey] != el.innerHTML) {
				out.push([el, el.innerHTML])
			}
		}
		for (let [el,val] of map.entries()) {
			el.contentEditable = val
		}
		return out
	}

	#getRootEditables() {
		return [...this.#editableElements]
			.filter(el => !this.#inEditableRegion(el.parentElement, false))
	}

	#undecorate() {
		for (let d of this.#decorators) {
			d.remove()
		}
		this.#decorators.clear()
	}

	#makeEditable(container) {
		for (let el of container.querySelectorAll(cfg.stopQuery)) {
			el.contentEditable = false
		}
		for (let el of container.querySelectorAll(cfg.elementQuery)) {
			this.#editableElements.add(el)
			el[this.#elKey] ??= el.innerHTML
			el.contentEditable = true
		}
	}

	#findLayoutElements(container) {
		for (let x of Object.values(this.cfg.layout)) {
			for (let el of container.querySelectorAll(x.query)) {
				el[this.#layoutKey] = x
				if (x.uneditable) {
					el.contentEditable = "false"
				}
			}
		}
	}

	style(nodeName) { return this.#style(nodeName) }
	#style(nodeName) {
		nodeName = nodeName.toUpperCase()
		var selection = window.getSelection();
		if (selection.isCollapsed) return;

		var range = selection.getRangeAt(0);

		var common = range.commonAncestorContainer
		if (common instanceof Element && common.querySelector("div")) {
			return
		}

		const startContainerNode = this.#isInside(range.startContainer, nodeName);
		const endContainerNode = this.#isInside(range.endContainer, nodeName);
		if (startContainerNode !== false || endContainerNode !== false) {
			// both range container nodes are part of the same node
			if (startContainerNode === endContainerNode) {
				this.#removeNode(startContainerNode);
			}
			else {
				// remove start container node
				if (startContainerNode !== false) {
					this.#removeNode(startContainerNode);
				}
				// remove end container node
				if (endContainerNode !== false) {
					this.#removeNode(endContainerNode);
				}
			}
		}
		else {
			// check if the selection fully contains a node of the same type
			// e.g. "Hello <strong>World</strong>!", if we would just surround the selection, the <strong>s would be nested like "<strong>Hello <strong>World</strong>!</strong>", which works, but isn't pretty, so we remove all nodes of the same type that are fully within the selection
			for (let i = 0; i < range.commonAncestorContainer.childNodes.length; ++i) {
				if (range.commonAncestorContainer.childNodes[i].nodeName === nodeName) {
					this.#removeNode(range.commonAncestorContainer.childNodes[i]);
				}
			}

			var newNode = document.createElement(nodeName);
			newNode.appendChild(range.extractContents());
			range.insertNode(newNode);
		}

		selection.empty();
		this.clean();

	}

	/// Returns true if the nodes contents is editable.
	/// Also true when the node is the editable container.
	/// By default returns false in inter-editable regions.
	#inEditableRegion(node, local = true) {
		if (!node) return false
		if (node.contentEditable == "true") return true
		if (node.contentEditable == "false" && local) return false
		if (!node.parentElement) return false
		return this.#inEditableRegion(node.parentElement)
	}

	/// Check if `node` is nested within a `nodeName` tag
	#isInside(node, nodeName) {
		if (node.parentElement == null) return false
		if (node.parentElement.nodeName === nodeName) {
			return node.parentElement;
		}
		else {
			return this.#isInside(node.parentElement, nodeName);
		}
	}

	#handlePaste(event) {
		event.preventDefault();

		// get text representation of clipboard
		var text = (event.originalEvent || event).clipboardData.getData("text/plain");

		// keep line breaks
		text = text.replaceAll(/\r?\n/g, "<br>");

		var selection = window.getSelection();
		if (selection.rangeCount === 0) return;
		var range = selection.getRangeAt(0);
		if (selection.toString().length === 0) {
			// range.deleteContents();
			var tmpDiv = document.createElement("div");
			tmpDiv.innerHTML = text;
			range.insertNode(tmpDiv);
			selection.empty();
			this.clean();
		}
	}

	#handleClick(event) {
		if (this.#inEditableRegion(event.target, false)) {
			this.#setTargetElement(event.target)
			if (this.onChangeTarget) this.onChangeTarget()
		} else if (["BUTTON","INPUT"].includes(event.target.nodeName)) {

		} else {
			this.targetElement = null
			this.#undecorate();
			this.clean();
		}
	}

	/// Applies decoration to the path of the targeted element
	#setTargetElement(el) {
		this.targetElement = el
		this.#redecorate()
	}

	#redecorate(el = this.targetElement) {
		this.#undecorate()
		if (el) this.#decoratePath(el)
	}

	#decoratePath(node) {
		let lastTop = 999999999
		for (let [elName, el] of this.#traversePath(node)) {
			let l = el[this.#layoutKey]
			let dec
			if (l && l.decorator) {
				dec = l.decorator(el)
			} else {
				let f = this.cfg.decorators[elName.toLowerCase()]
				if (f) {
					dec = f(el)
				}
			}
			if (!dec) continue
			dec = this._toElement(dec)
			let bb = el.getBoundingClientRect()
			dec.contentEditable = false
			dec.setAttribute("decorator", "")
			let top = bb.top + scrollY
			if (lastTop - top < 32) {
				top = lastTop - 32
			}
			lastTop = top
			dec.style.position = "absolute"
			dec.style.top = top -32 + "px"
			dec.style.left = bb.left + scrollX + "px"
			document.body.appendChild(dec)
			this.#decorators.add(dec)
		}
	}

	getPath(node) {
		let path = [...this.#traversePath(node)].map(([name,_]) => name)
		path.reverse()
		return path
	}

	*#traversePath(el) {
		let outsideRegion = !this.#inEditableRegion(el.parentElement)
		while (el) {
			let l = el[this.#layoutKey]
			if (l) {
				yield [l.name, el]
			} else if (!outsideRegion) {
				yield [el.nodeName, el]
			}
			el = el.parentElement
			switch (el?.contentEditable) {
				case "true": outsideRegion = true; break;
				case "false": outsideRegion = false; break;
			}
		}
	}

	/// Cleans up some nasty html
	clean(recurse = false) {
		let changed = false
		for (let container of this.#editableElements) {
			container.innerHTML = container.innerHTML.replaceAll("&nbsp;", " ");
			for (let el of container.querySelectorAll("div:has(br:nth-child(2):last-child),div:has(br:only-child)")) {
				if (el.classList.length == 0 && el.attributes.length == 0) {
					changed = true
					el.replaceWith(el.childNodes[0])
				}
			}
			for (let el of container.querySelectorAll("div:empty")) {
				if (el.classList.length == 0 && el.attributes.length == 0) {
					changed = true
					el.remove()
				}
			}
			for (let el of container.querySelectorAll("p:has(>br:only-child)")) { // p:empty:not(:has(*))
				changed = true
				el.remove()
			}
		}
		if (recurse && changed) this.clean(true)
	}

	createLayOutElement(name) {
		let selection = window.getSelection();
		if (selection.rangeCount === 0) return null;
		let range = selection.getRangeAt(0);
		let contentNode = range.commonAncestorContainer
		if (!(contentNode instanceof Element)) {
			contentNode = contentNode.parentElement
		}
		if (!this.#inEditableRegion(contentNode)) {
			return null
		}
		let l = this.cfg.layout[name]

		// let con = this.#findMatchingParent(contentNode, `:not(p,${this.cfg.basicStyles})`)
		// if (!this.#inEditableRegion(con)) return null

		if (selection.type == "Range") {
			if (l.create) {
				let el = this._toElement(l.create(contentNode))
				if (el) {
					contentNode.replaceWith(el)
				}
			}
		} else {
			return this.#insertNode(l.html ?? l.create(null))
		}
		return null
	}

	#findMatchingParent(node, selector) {
		if (!node) return null
		if (node.matches(selector)) return node
		return this.#findMatchingParent(node.parentElement, selector)
	}

	/// Inserts element, tag or html at cursor
	/// Will fail and return null with an active cursor selection
	/// By default focuses the inserted element
	insertNode(el, setTarget = true) {
		el = this.#insertNode(el)
		if (el) {
			this.#findLayoutElements(el.parentElement)
			this.#makeEditable(el.parentElement)
			if (setTarget) {
				this.#setTargetElement(el)
				el.focus()
			}
		}
		return el
	}

	/// Inserts element, tag or html at cursor
	#insertNode(el) {
		el = this._toElement(el)
		var selection = window.getSelection();
		if (selection.rangeCount === 0) return null;
		var range = selection.getRangeAt(0);

		if (!this.#inEditableRegion(range.startContainer)) {
			return
		}

		if (selection.type === "Caret") {
			range.insertNode(el);
			range.insertNode(document.createElement("BR"))
			selection.empty();
			return el
		}
		return null
	}

	#removeNode(node) {
		let parent = node.parentElement;
		for ( let i = 0 ; i < parent.childNodes.length ; ++i ) {
			if ( parent.childNodes[i] === node ) {
				while ( node.childNodes.length > 0 ) {
					parent.insertBefore( node.firstChild , node );
				}
				parent.removeChild( node );
				return;
			}
		}
	}

	teardown() {
		this.#mutationObserver.disconnect()
		this.#editableElements.clear()
		this.#undecorate()
		for (let el of this.#container.querySelectorAll("[contenteditable]")) {
			el.removeAttribute("contenteditable")
			delete el[this.#elKey]
		}
		this.#isInit = false
	}

	/// Convert tagnames, snippets and DocumentFragments to Element's
	_toElement(el) {
		if (typeof el == "string") {
			if (el.trimStart().startsWith("<")) {
				let t = document.createElement("template")
				t.innerHTML = el
				el = t.content.children[0]
			} else {
				el = document.createElement(el.toUpperCase())
			}
		}
		if (el instanceof DocumentFragment) {
			el = el.childNodes[0]
		}
		return el
	}

}

function html(innerHTML) {
	let t = document.createElement("template")
	t.innerHTML = innerHTML
	return t.content.children[0]
}
