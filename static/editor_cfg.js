
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

function swapPrevSibling(el) {
	let prev = el.previousElementSibling
	let parent = el.parentElement
	console.log(el,prev,parent)
	if (!prev || !parent) return
	el.remove()
	parent.insertBefore(el, prev)
}

const cfg = {
	elementQuery: "[editable]",
	stopQuery: "[noedit]",
	onUpload(event) {
		let input = event.target
		let reader = new FileReader()
		reader.addEventListener(
			"load", () => {
				let img = document.createElement("IMG")
				img.src = reader.result;
				img.classList.add("w3-image")
				editor.insertNode(img)
				input.value = ""
			},
			false,
		);
		reader.readAsDataURL(input.files[0]);
	},
	basicStyles: ["code", "b", "i", "h1", "h2", "h3", "h4","a"],
	insertable: {
		"ul": `<ul><li></li></ul>`,
		"ol": `<ol><li></li></ol>`,
		"hr": `<hr/>`,
	},
	decorators: {
		"a": (el) => {
			let input = document.createElement("INPUT")
			input.value = el.href
			input.onchange = () => el.href = input.value
			return input
		}
	},
	layout: {
		"panel": {
			query: ".w3-panel",
			create(el) {
				return `<div class="w3-panel w3-margin w3-padding" style="border-left: 6px solid blue;">${
					el?.outerHTML ?? "<p></p>"
				}</div>`
			},
			decorator: btnsDecorator(
				["Delete", removeNode],
				el => colorBtn(c => el.style.borderColor = c, el.style.borderColor)
			)
		},
		"card": {
			query: ".w3-card-4",
			create(el) {
				return `<div class="w3-card-4 w3-round w3-padding w3-margin">${el?.outerHTML ?? "<p></p>"}</div>`
			},
			decorator: btnsDecorator(
				["Delete", removeNode],
				["Round", el => rotClasses(el, "w3-round w3-round-large w3-round-xlarge")],
				["Padding", el => rotClasses(el, "w3-padding w3-padding-32 w3-padding-64")],
				["Margin", el => rotClasses(el, "w3-margin")],
				["Align", el => rotClasses(el, "w3-center w3-right-align")],
				el => colorBtn(c => el.style.backgroundColor = c, el.style.backgroundColor)
			)
		},
		"col": {
			hidden: true,
			query: ".w3-col",
			html: `<div editable class="w3-col w3-padding w3-third"></div>`,
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
				["<<", swapPrevSibling],
				["Align", el => rotClasses(el, "w3-center w3-right-align")],
			),
		},
		"container": {
			query: ".w3-container",
			create(el) {
				return `<div class="w3-container">${el?.outerHTML ?? ""}</div>`
			},
			decorator: btnsDecorator(
				["Delete", removeNode],
				["Auto", el => rotClasses(el, "w3-auto")],
				["Round", el => rotClasses(el, "w3-round w3-round-large w3-round-xlarge")],
				["Padding", el => rotClasses(el, "w3-padding w3-padding-32 w3-padding-64")],
				["Margin", el => rotClasses(el, "w3-margin")],
				["Align", el => rotClasses(el, "w3-center w3-right-align")],
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
