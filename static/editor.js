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
			this.clean(true)
			this.#makeEditable(this.#container)
			this.#findLayoutElements(this.#container)
			for (let el of this.#editableElements) {
				this.#mutationObserver.observe(el, {"subtree": true, "childList": true})
			}
			this.#isInit = true
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

	style(nodeName) {
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
			// both ends inside a `nodeName`
			if (startContainerNode === endContainerNode) {
				console.log("remove common")
				this.#removeNode(startContainerNode);
			}
			else {
				console.log("remove start")
				// remove start container node
				if (startContainerNode !== false) {
					this.#removeNode(startContainerNode);
				}
				console.log("remove end")
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
					console.log("remove child")
					this.#removeNode(range.commonAncestorContainer.childNodes[i]);
				}
			}

			var newNode = document.createElement(nodeName);
			newNode.appendChild(range.extractContents());
			console.log("extract/replace", newNode, range)
			range.insertNode(newNode);
		}

		selection.empty();
		this.clean();

	}

	#withinEditableRegion(node, local = true) {
		return this.#inEditableRegion(node?.parentElement, local)
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
		} else if (!this.#findMatchingParent(event.target, "[decorator]")) {
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
			dec = this.#toElement(dec)
			let bb = el.getBoundingClientRect()
			dec.contentEditable = false
			dec.setAttribute("decorator", "")
			let top = bb.top + scrollY
			let h = this.cfg.decoratorHeight = 32
			if (lastTop - top < h) {
				top = lastTop - h
			}
			lastTop = top
			dec.style.position = "absolute"
			dec.style.top = top - h + "px"
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
		let outsideRegion = !this.#withinEditableRegion(el)
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
	clean(repeat = false) {
		let changed
		do {
			changed = false
			for (let container of this.#editableElements) {
				container.innerHTML = container.innerHTML.replaceAll("&nbsp;", " ");
				for (let el of container.querySelectorAll("div:empty:has(br:nth-child(2):last-child),div:empty:has(br:only-child)")) {
					if (el.classList.length == 0 && el.attributes.length == 0) {
						changed = true
						console.log("clean 1", el.outerHTML)
						el.replaceWith(el.childNodes[0])
					}
				}
				for (let el of container.querySelectorAll("div:empty")) {
					if (el.classList.length == 0 && el.attributes.length == 0) {
						changed = true
						console.log("clean empty div", el.outerHTML)
						el.remove()
					}
				}
				for (let el of container.querySelectorAll("div")) {
					if (el.classList.length == 0 && el.attributes.length == 0) {
						changed = true
						console.log("clean pure div", el.outerHTML)
						this.#removeNode(el)
					}
				}
				for (let el of container.querySelectorAll("p:has(>br:only-child),div:has(>br:only-child)")) { // p:empty:not(:has(*))
					changed = true
					console.log("clean contained br", el.outerHTML)
					el.replaceWith(el.childNodes[0])
				}
			}
		} while (changed && repeat)
	}

	/// Place layout element at/around selection
	createLayOutElement(name) {
		let layout = this.cfg.layout[name]
		let range = this.#splitExpandToLayoutBase()
		if (!range) return
		if (!range.collapsed) {
			if (layout.create) {
				return this._wrapSelection((el) => layout.create(el), range)
			}
		} else {
			return this.#insertNode(layout.html ?? layout.create(null))
		}
		return null
	}

	#findMatchingParent(node, selector) {
		if (!node) return null
		if (node.matches(selector)) return node
		return this.#findMatchingParent(node.parentElement, selector)
	}

	#findMatchingParent2(node, selector) {
		if (!node || !node.parentElement) return null
		if (node.parentElement.matches(selector)) return node
		return this.#findMatchingParent2(node.parentElement, selector)
	}

	/// Given a range like <b>ab[cd<i>ef]gh</i>ij</b>
	/// The goal is produce something like <b>ab<i>cd</i></b> [<b>cd<i>ef</i></b>] <b><i>gh</i>ij</b>
	/// Thus spliting the formatting, such that we may wrap the range in a layout element
	/// For at range like <b>[hello]</b>] we should expand to [<b>hello</b>]
	#splitExpandToLayoutBase(r = getSelection().getRangeAt(0)) {
		if (!r) return null
		// todo: check we are not splitting something we should not
		if (!this.#inEditableRegion(r.commonAncestorContainer)) {
			return null
		}

		let changed = true, con = r.commonAncestorContainer
		while (changed && !r.collapsed) {
			changed = false
			con = r.commonAncestorContainer
			if (con instanceof Text) {
				if (r.startOffset == 0 && con.length == r.endOffset) {
					console.log("expand text")
					r.setStartBefore(con)
					r.setEndAfter(con)
					changed = true
				} else {
					// only part of text is selected
					break
				}
			}
			else if (con instanceof Element) {
				if (!con.matches(this.cfg.layoutBaseQuery)) {
					if (r.startOffset == 0 && con.childNodes.length == r.endOffset) {
						console.log("expand element")
						r.setStartBefore(con)
						r.setEndAfter(con)
						changed = true
					} else {
						// only part of element is selected
						break
					}
				}
			}
		}
		if (con instanceof Element && con.matches(this.cfg.layoutBaseQuery)) {
			console.log(r)
			return r
		}
		let n = this.#findMatchingParent2(con, this.cfg.layoutBaseQuery)
		console.log("matching", n, con)
		if (!n) return null
		let ic = r.extractContents()
		r.setStartBefore(n)
		r.insertNode(r.extractContents())
		r.collapse(false)
		r.insertNode(ic)
		return r
	}

	wrapOrInsert(el) {
		let range = getSelection().getRangeAt(0)
		if (range.collapsed) {
			range = this.#splitExpandToLayoutBase(range)
			if (!range) return null
			el = this.insertNode(el)
		} else if (el instanceof Function) {
			range = this.#splitExpandToLayoutBase(range)
			if (!range) return null
			el = this._wrapSelection(el, range)
			if (!el) return null
			this.#findLayoutElements(el.parentElement)
			this.#makeEditable(el.parentElement)
			if (setTarget) {
				this.#setTargetElement(el)
				el.focus()
			}
		}
		if (el) this.clean(true)
		return el
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
		el = this.#toElement(el)
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

	/// Wrap range using a function
	_wrapSelection(f, range = window.getSelection().getRangeAt(0)) {
		if (range.collapsed) return null
		if (!this.#inEditableRegion(range.commonAncestorContainer)) {
			console.log("not editable")
			return null
		}
		let content = range.extractContents()
		let wrapper = f(content)
		if (wrapper) wrapper = this.#toElement(wrapper)
		range.insertNode(wrapper ?? content)
		return wrapper
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

	/// Convert tagnames, snippets and DocumentFragments to Element's
	#toElement(el) {
		if (el instanceof Function) {
			el = el(null)
		}
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
			let span = document.createElement("SPAN")
			span.appendChild(el)
			return span
		}
		return el
	}

}
