
function removeNode(node) {
	let parent = node.parentElement;
	while (node.childNodes.length > 0) {
		parent.insertBefore(node.firstChild, node);
	}
	node.remove()
}

function setClasses(el, classList) {
	el.classList.remove(...el.classList)
	el.classList.add(...classList.split(" "))
}

function rotClasses(el, classList, addEmpty = true) {
	classList = classList.split(" ")
	if (addEmpty) classList.push("")
	let i = classList.findIndex(v => el.classList.contains(v))
	if (i == -1 || i >= classList.length) i = classList.length - 1
	if (classList[i]) {
		el.classList.remove(classList[i])
	}
	i = (i + 1) % classList.length
	if (classList[i]) {
		el.classList.add(classList[i])
	}
}

function btnsDecorator(...btns) {
	return (el) => {
		let d = document.createElement("DIV")
		for (let btn of btns) {
			if (btn instanceof Function) {
				d.appendChild(btn(el))
				continue
			}
			if (btn instanceof Node) {
				d.appendChild(btn)
				continue
			}
			let [name, f] = btn
			let b = document.createElement("BUTTON")
			b.innerText = name
			b.onclick = () => f(el)
			d.appendChild(b)
		}
		return d
	}
}

function uploadImg(filePath, img = document.createElement("IMG")) {
	let reader = new FileReader()
	if (!img) img = editor.insertNode("img")
	if (!img) return
	img.classList.add("w3-image")
	reader.addEventListener(
		"load", () => {
			img.src = reader.result;
		},
		false,
	);
	reader.readAsDataURL(filePath);
}

async function listAssets(dir = "/assets") {
	let doc = await fetch(dir)
		.then(response => response.text())
		.then(str => new DOMParser().parseFromString(str, "text/html"))
	let files = [...doc.querySelectorAll("li a")]
		.map(f => [dir + "/" + f.attributes.href.value, f.innerText, f.parentElement.attributes.filetype.value == "dir"])
	return files
}

async function updateAssetSelector(select, img, dir = "/assets") {
	select.onchange = () => {
		let [href, _, dir] = fs[select.value]
		if (dir) {
			updateAssetSelector(select, img, href)
		} else {
			img.src = href
		}
	}
	let fs = await listAssets(dir)
	select.replaceChildren()
	select.appendChild(html`<option selected disabled>${dir}</option>`)
	for (let [i, [_,name,__]] of Object.entries(fs)) {
		let option = document.createElement("OPTION")
		option.value = i
		option.innerText = name
		select.appendChild(option)
	}
}

function assetSelector(el) {
	let span = html`<span><select></select><input type="file"></input></span>`
	let select = span.querySelector("select")
	updateAssetSelector(select, el)
	let input = span.querySelector("input")
	input.onchange = () => uploadImg(input.files[0], el)
	return span
}

function colorBtn(f, val) {
	let div = document.createElement("SPAN")
	let b = document.createElement("INPUT")
	b.type = "color"
	b.value = val
	b.onchange = () => f(b.value)
	div.appendChild(b)
	let b2 = document.createElement("BUTTON")
	b2.innerText = "X"
	b2.onclick = () => f(null)
	div.appendChild(b2)
	return div
}

function renameNode(el, newName) {
	let newNode = document.createElement(newName.toUpperCase())
	newNode.replaceChildren(...el.children)
	el.replaceWith(newNode)

	newNode.classList = el.classList
	newNode.attributes = el.attributes
	return newNode
}

function swapPrevSibling(el) {
	let prev = el.previousElementSibling
	let parent = el.parentElement
	console.log(el,prev,parent)
	if (!prev || !parent) return
	el.remove()
	parent.insertBefore(el, prev)
}

function listDecorator(el) {
	let dec = html`<div><button>Type</button></div>`
	dec.firstChild.onclick = () => {
		switch (el.nodeName) {
			case "OL":
				el = renameNode(el, "UL")
				break;
			case "UL":
				el = renameNode(el, "OL")
				break;
		}
	}
	return dec
}

const cfg = {
	elementQuery: "[editable]",
	stopQuery: "[noedit]",
	layoutBaseQuery: "div,section",
	avoidExit: true,
	decoratorHeight: 32,
	basicStyles: ["p", "code", "b", "i", "h1", "h2", "h3", "h4", "a"],
	insertable: {
		"ul": (el) => txt`<ul><li>${el}</li></ul>`,
		"dl": `<dl><dt></dt><dd></dd></dl>`,
		"img": `<img class="w3-image" src="https://images.freeimages.com/fic/images/icons/949/token/256/word_processor.png"/>`,
		"hr": `<hr/>`,
	},
	decorators: {
		"a": (el) => {
			let div = html`<span><input></input><button>X</button></span>`
			let input = div.querySelector("input")
			input.value = el.href
			input.onchange = () => el.href = input.value
			let button = div.querySelector("button")
			button.onclick = () => removeNode(el)
			return div
		},
		"li": (el) => {
			let dec = html`<span><button>Up</button></span>`
			dec.children[0].onclick = () => swapPrevSibling(el)
			return dec
		},
		"img": assetSelector,
		"ul": listDecorator,
		"ol": listDecorator,
	},
	layout: {
		"panel": {
			query: ".w3-panel",
			create(el) {
				return txt`
					<div class="w3-panel w3-margin w3-padding" style="border-left: 6px solid blue;">
						${el ?? "<p></p>"}
					</div>`
			},
			decorator: btnsDecorator(
				["Delete", removeNode],
				el => colorBtn(c => el.style.borderColor = c, el.style.borderColor)
			)
		},
		"card": {
			query: ".w3-card-4",
			create(el) {
				return txt`
					<div class="w3-card-4 w3-round w3-padding w3-margin">
						${el ?? "<p></p>"}
					</div>`
			},
			decorator: btnsDecorator(
				["Delete", removeNode],
				["Round", el => rotClasses(el, "w3-round w3-round-large w3-round-xlarge")],
				["Padding", el => rotClasses(el, "w3-padding w3-padding-32 w3-padding-64")],
				["Margin", el => rotClasses(el, "w3-margin")],
				["Inline", el => rotClasses(el, "w3-show-inline-block")],
				["Align", el => rotClasses(el, "w3-center w3-right-align")],
				el => colorBtn(c => el.style.backgroundColor = c, el.style.backgroundColor)
			)
		},
		"col": {
			hidden: true,
			query: ".w3-col",
			// html: `<div editable class="w3-col w3-padding w3-third"></div>`,
			decorator: btnsDecorator(
				["Delete", el => {
					if (el.innerText.trim().length == 0 || confirm("Delete coloumn? All content is lost")) {
						let parentRow = el.parentElement
						el.remove()
						if (parentRow.children.length == 0) {
							parentRow.parentElement.remove()
						}
					}
				}],
				["1/2", el => setClasses(el, "w3-col w3-padding w3-half")],
				["1/3", el => setClasses(el, "w3-col w3-padding w3-third")],
				["2/3", el => setClasses(el, "w3-col w3-padding w3-twothird")],
				["Rest", el => setClasses(el, "w3-col w3-padding w3-rest")],
				["<<", swapPrevSibling],
				["Align", el => rotClasses(el, "w3-center w3-right-align")],
			),
		},
		"container": {
			query: ".w3-container",
			create(el) {
				return txt`<div class="w3-container">${el}</div>`
			},
			decorator: btnsDecorator(
				["Delete", removeNode],
				["Auto", el => rotClasses(el, "w3-auto")],
				["Round", el => rotClasses(el, "w3-round w3-round-large w3-round-xlarge")],
				["Padding", el => rotClasses(el, "w3-padding w3-padding-32 w3-padding-64")],
				["Margin", el => rotClasses(el, "w3-margin")],
				["Inline", el => rotClasses(el, "w3-show-inline-block")],
				["Align", el => rotClasses(el, "w3-center w3-right-align")],
				el => colorBtn(c => el.style.backgroundColor = c, el.style.backgroundColor)
			)
		},
		"bar": {
			query: ".w3-bar",
			uneditable: true,
			html: `<div class="w3-bar"></div>`,
			decorator: btnsDecorator(
				["Delete", el => el.remove()],
				["Add item", el => el.appendChild(html`<div editable class="w3-bar-item"></div>`)],
				el => colorBtn(c => el.style.backgroundColor = c, el.style.backgroundColor)
			)
		},
		"bar-item": {
			query: ".w3-bar-item",
			hidden: true,
			decorator: btnsDecorator(
				["Delete", removeNode],
				["Side", el => rotClasses(el, "w3-right")],
				el => colorBtn(c => el.style.backgroundColor = c, el.style.backgroundColor)
			)
		},
		"row": {
			query: "div:has(>.w3-row:first-child)",
			uneditable: true,
			html: `
				<div class="w3-padding">
					<div class="w3-row">
						<div editable class="w3-col w3-padding w3-third">
						</div>
					</div>
				</div>`,
			decorator: btnsDecorator(
				["Add column", el => el.querySelector(".w3-row").appendChild(html(`<div editable class="w3-col w3-third w3-padding"></div>`))],
			),
		},
	}
}
