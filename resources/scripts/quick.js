/** 
 * JavaScript for the MichalesWriter and JudisWriter HTML files. Dynamically
 * constructs a keybaord, provides functionality to the keyboard, saves work
 * to the server.
 * 
 * @primary author Jacob Vincent
 * @primary author Lyntus Serieux
 * @author Evan Farrell (only regarding xhttp requests)
 **/

//Variables to keep track of previous states
var oldStack = [];
var currentStack;

//current text field being edited
var focus = "userText";

//Variables for cursor and it's position in the text
var curs;
var start;
var end;

//Height of textarea
var textareaSize;

//Keep track of how scrolled the userText 
var scroll;

//Var to keep track of whether the last button pushed was a predicted word
var lastPred = false;

//Boards
var lowerBoard = ["", "", "", "", "",
    "`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "Backspace",
    "[", "]", "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "DeleteWord",
    "Caps", "a", "s", "d", "f", "g", "h", "j", "k", "l", "\'", "Enter",
    ";", "\\", "z", "x", "c", "v", "b", "n", "m", ",", ".", "/",
    "Undo", "Space Bar", "Redo"
];
var capBoard = ["", "", "", "", "",
    "~", "!", "@", "#", "$", "%", "^", "&", "*", "(", ")", "_", "+", "Backspace",
    "{", "}", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "DeleteWord",
    "Caps", "A", "S", "D", "F", "G", "H", "J", "K", "L", "\"", "Enter",
    ":", "|", "Z", "X", "C", "V", "B", "N", "M", "<", ">", "?",
    "Undo", "Space Bar", "Redo"
];

//Array to hold all words from dictionary text file
var dictionary = [];

/**
 * Runs onload of page and sets up event listeners and variables.
 * 
 * @returns {undefined}
 */
function startUp() {

    //If there is no text in the body, set the name to blank as well
    if (document.getElementById("userText").value === "") {
        document.getElementById("title").value = "";
    }

    //Save current body
    try {
        getCursor();
        var begin = [];
        begin.push(document.getElementById("userText").value);
        start = document.getElementById("userText").value.length;
        end = start;
        begin.push(start + "");
        begin.push(end + "");
        document.getElementById(focus).setSelectionRange(end, end);
        currentStack = [begin];
    } catch (typeError)
    {
        currentStack = [["", "0", "0"]];
    }

    scroll = document.getElementById("userText").scrollTop;

    //Predictive words (load in from text file)
    var dictionary2 = new XMLHttpRequest();
    dictionary2.open('GET', '/ProcessedDictionaryWords.txt');
    dictionary2.onreadystatechange = function () {
        //Split the dictionary by new lines and create an array
        dictionary = dictionary2.responseText.split("\n");
        //Set up the keyboard
        getCursor();
        predict();
        updateBoard();
    };
    dictionary2.send();

    //Autosave every 30 seconds
    var periodicSave = setInterval(myTimer, 30000);
    function myTimer() {
        edit();
    }

    //With every release of the mouse, check focus and if focus was lost,
    //reapply it to the last field.
    document.addEventListener('mouseup', function (event) {
        //If active element onclick is one of the text boxes, then
        //check to see if the keyboard should be set to caps based
        //on punctuation.
        if (document.activeElement === document.getElementById("userText")
                || document.activeElement === document.getElementById("title")) {
            lastPred = false;
            getCursor();
            checkPunc();
        }
        //If focus is not on textbox or title, change it back to what was
        //previously in focus.
        if (document.activeElement !== document.getElementById("userText")
                && document.activeElement !== document.getElementById("title")) {
            document.getElementById(focus).focus();
        }
        getCursor();
        updateStack();
        predict();
        updateBoard();
    });

    //Listen for when a key is released. Writer works with hardwired keyboard
    //and onscreen keyboard together.
    document.addEventListener('keyup', function (event) {
        getCursor();
        if (focus === "userText") {
            //If last word was predicted and the next thing pressed is
            //a punctuation, remove the space after the word
            if (lastPred && (document.getElementById("userText").value.substring(start - 1, start) === "." ||
                    document.getElementById("userText").value.substring(start - 1, start) === "!" ||
                    document.getElementById("userText").value.substring(start - 1, start) === "?" ||
                    document.getElementById("userText").value.substring(start - 1, start) === "," ||
                    document.getElementById("userText").value.substring(start - 1, start) === "\"" ||
                    document.getElementById("userText").value.substring(start - 1, start) === "'")) {
                //A single letter is added
                //Add the word to the textarea
                var nextString = document.getElementById(focus).value;
                //Using cursor location, determine where the letter is to be added
                var first = nextString.substring(0, start - 2);
                var last = nextString.substring(end - 1, nextString.length);

                //add the letter
                document.getElementById(focus).value = first + last;
            }
            updateStack();
        }
        predict();
        updateBoard();
        checkPunc();
        lastPred = false;
    });
}

/** 
 * Adds a word to the textarea
 * 
 * @param {String} word The word to be added to the textarea 
 **/
function addWord(word) {
    //reapply focus
    document.getElementById(focus).focus();
    switch (word.length) {
        case 0:
            //Empty Predicted word is selected. Do nothing and re-establish
            //cursor at end of highlighted area
            document.getElementById(focus).setSelectionRange(end, end);
            getCursor();
            break;
        case 1:
            //If a period is being pressed and predict was last used, remove
            //space.
            if ((word === "." || word === "!" || word === "?" || word === "," ||
                    word === "\"" || word === "'") && lastPred === true) {
                start = start - 1;
            }
            //A single letter is added
            //Add the word to the textarea
            var nextString = document.getElementById(focus).value;
            //Using cursor location, determine where the letter is to be added
            var first = nextString.substring(0, start);
            var last = nextString.substring(end, nextString.length);

            //add the letter
            document.getElementById(focus).value = first + word + last;
            //If the cursor is only highlighting a single character, move it
            //one space to the right
            if (start === end) {
                start++;
                end++;
                document.getElementById(focus).setSelectionRange(start, end);
                getCursor();
            } else {
                //If something was highlighted, it is now replaced by a single
                //character. Move cursor to start location + 1
                start++;
                end = start;
                document.getElementById(focus).setSelectionRange(start, end);
                getCursor();
            }
            if (focus === "userText") {
                updateStack();
            }
            predict();
            updateBoard();
            lastPred = false;
            break;

        default:
            //Predicted word is selected
            //If something is highlighted, reapply focus and do nothing
            if (curs.selectionStart === curs.selectionEnd) {
                var tempTracker = start;
                var tempString = [];
                var fill = "";
                //Move left until the start of the word is found
                while (document.getElementById(focus).value.substring(tempTracker - 1, tempTracker) !== " " &&
                        document.getElementById(focus).value.substring(tempTracker - 1, tempTracker) !== "" &&
                        document.getElementById(focus).value.substring(tempTracker - 1, tempTracker) !== "\n")
                {
                    tempString.push(document.getElementById(focus).value.substring(tempTracker - 1, tempTracker));
                    tempTracker--;
                }
                //Fill in missing letters to complete the word
                fill = word.substring(tempString.length, word.length);
                document.getElementById(focus).focus();
                //Add the word to the textarea
                var nextString = document.getElementById(focus).value;
                var first = nextString.substring(0, start);
                var last = nextString.substring(end, nextString.length);

                document.getElementById(focus).value = first + fill + " " + last;

                //Move cursor to end of word
                start = start + fill.length + 1;
                end = end + fill.length + 1;
                if (focus === "userText") {
                    updateStack();
                }
                predict();
                updateBoard();
                lastPred = true;
            }
            document.getElementById(focus).setSelectionRange(end, end);
            getCursor();
            break;
    }
    //After Michael presses a letter on the capital board, switch to lower
    //case
    if (Keyboard.properties.capsLock && JSON.parse(document.getElementById('userId').innerHTML) === "michael") {
        Keyboard.properties.capsLock = !Keyboard.properties.capsLock;
        updateBoard();
    }
    checkPunc();
}

/**
 * Checks if the last 2 spaces are punctuation followed by a space. If true,
 * the board becomes capital. (Michael only)
 * 
 * @returns {undefined}
 */
function checkPunc() {
    var checkForPunc = document.getElementById(focus).value.substring(start - 2, start);
    if (JSON.parse(document.getElementById('userId').innerHTML) === "michael") {
        if (checkForPunc === ". " ||
                checkForPunc === "! " ||
                checkForPunc === "? " ||
                checkForPunc === "") {
            Keyboard.properties.capsLock = true;
            updateBoard();
        }
    }
}
/**
 * Called after every button or key press. Updates the board
 * as to display the predicted words in realtime.
 * 
 * @returns {undefined}
 */
function updateBoard() {
    //Reconstruct keyboard
    var board;
    if (Keyboard.properties.capsLock) {
        board = capBoard;
    } else {
        board = lowerBoard;
    }
    var i = 0;
    for (const key of Keyboard.elements.keys) {

        if (key.childElementCount === 0) {
            key.textContent = board[i];
        }
        i++;
    }
    //adjust size of textbox relative to keyboard
    textareaSize = document.getElementsByClassName("keyboard keyboard--hidden")[0].offsetTop - document.getElementById("userText").offsetTop - 10;
    document.getElementById("userText").style.height = textareaSize + "px";
}

/**
 * Determines the first 5 words from ProcessedDictionaryWords.txt that
 * begin with the same letters currently between a space/newline/empty string
 * and the location of the cursor and updates the board variables to include
 * those words.
 * 
 * @type String|String.predict|predict.predict.predict
 */
function predict() {
    //predictive
    var tempTracker = start;
    var tempString = [];
    var predict = "";
    //Find start of word (Move left until a newline, a space, or empty string)
    while (document.getElementById(focus).value.substring(tempTracker - 1, tempTracker) !== " " &&
            document.getElementById(focus).value.substring(tempTracker - 1, tempTracker) !== "" &&
            document.getElementById(focus).value.substring(tempTracker - 1, tempTracker) !== "\n")
    {
        //Add each letter to a stack
        tempString.push(document.getElementById(focus).value.substring(tempTracker - 1, tempTracker));
        tempTracker--;
    }
    //reverse the stack so it is in the order of the start of the word
    tempString.reverse();
    //Create a string
    for (var i = 0; i < tempString.length; i++) {
        predict = predict + tempString[i];
    }
    predict = predict.toLowerCase();

//Find 5 first words in dictionary with same start as current string
// var d keeps track of how mnay matches have been found
    var d = 0;
    //var b is the index of the dictionary
    var b = 0;
    while (d < 5 && b < dictionary.length) {
        if (dictionary[b].length >= predict.length) {
            if (dictionary[b].substring(0, predict.length) === predict) {
                //Change the first 5 elements of the board arrays to the
                //predicted words
                lowerBoard[d] = dictionary[b];
                capBoard[d] = dictionary[b].toUpperCase();
                d++;
            }
        }
        b++;
    }
    //fill in buttons with no matches
    if (d < 5) {
        for (var y = d; y < 5; y++) {
            lowerBoard[y] = "";
            capBoard[y] = "";
        }
    }
}

/**
 * Deletes either highlighted text or one space before the cursor and
 * adjusts the cursor location
 * 
 * @returns {undefined}
 */
function del() {
    document.getElementById(focus).focus();

    var curString = document.getElementById(focus).value;

    //If cursor is in one spot, remove last character
    if (start === end) {
        document.getElementById(focus).value =
                curString.substring(0, start - 1)
                + curString.substring(end, curString.length);
        if (start > 0) {
            start--;
            end--;
        }
        //update the cursor location
        document.getElementById(focus).setSelectionRange(start, end);
        getCursor();
    } else {
        //Else, delete current highlighted area and move cursor
        document.getElementById(focus).value =
                curString.substring(0, start)
                + curString.substring(end, curString.length);
        end = start;
        document.getElementById(focus).setSelectionRange(start, end);
        getCursor();
    }

    if (focus === "userText") {
        updateStack();
    }
    predict();
    updateBoard();
    checkPunc();
    lastPred = false;
}

/**
 * Deletes the word that the cursor is currently on as well as a space before
 * the word if there is one. (This function will delete a word if the cursor
 * is infront of the first letter, behind the last letter, or anywhere in
 * between
 * 
 * @returns {undefined}
 */
function delword() {
    //If a section is highlighted, Call del() to delte it
    if (start !== end) {
        del();
    } else {
        //Else, locate left and right bounds of word and remove the word.
        document.getElementById(focus).focus();
        var curText = document.getElementById(focus).value;

        //get left bound
        var i = 0;
        while (curText.substring(start - i - 1, start - i) !== " " &&
                curText.substring(start - i - 1, start - i) !== "\n" &&
                start - i >= 0) {
            i++;
        }

        //get right bound
        var j = 0;
        while (curText.substring(start + j, start + j + 1) !== " " &&
                curText.substring(start + j, start + j + 1) !== "" &&
                curText.substring(start + j, start + j + 1) !== "\n"
                && start + j <= curText.length) {
            j++;
        }
        //Remove word using calculated bounds
        document.getElementById(focus).value = curText.substring(0, start - i - 1)
                + curText.substring(start + j, curText.length);
        //if the cursor is not at start, move it left 1 extra to account for
        //removed space. Otherwise set start to 0
        if (start > 0) {
            start = start - i - 1;
        } else
            start = 0;
        //If moving left caused start to become negative, change it to 0
        if (start < 0) {
            start = 0;
        }
        end = start;
        document.getElementById(focus).setSelectionRange(start, end);
        if (focus === "userText") {
            updateStack();
        }
        getCursor();
        predict();
        updateBoard();
        checkPunc();
        lastPred = false;
    }
}

/**
 * Undoes the last change made by the user and places that change on a stack
 * so that the user can redo it if they choose. Also retruns cursor to the
 * position it was at when in this state.
 * 
 * @returns {undefined}
 */
function undo() {
    document.getElementById(focus).focus();
    if (oldStack.length > 0) {
        var lastText = oldStack.pop();
        currentStack.push(lastText);
        document.getElementById("userText").value = lastText[0];
        document.getElementById(focus).setSelectionRange(parseInt(lastText[1]), parseInt(lastText[2]));
        getCursor();
        lastPred = false;
        predict();
        checkPunc();
        updateBoard();
    }
}

/**
 * Pops the last item off oldStack (the last thing undone)
 * and sets the textArea equal to it and returns the cursor to the location
 * it was at in this state.
 * 
 * @returns {undefined}
 */
function redo() {
    document.getElementById(focus).focus();
    if (currentStack.length > 1) {
        oldStack.push(currentStack.pop());
        var change = currentStack[currentStack.length - 1];
        document.getElementById("userText").value = change[0];
        document.getElementById(focus).setSelectionRange(parseInt(change[1]), parseInt(change[2]));
        getCursor();
        lastPred = false;
        predict();
        checkPunc();
        updateBoard();
    }
}

/**
 * When a change is made, that change is stored in oldStack so that the user
 * may undo changes they made. The stack has a size limit of 15 so the user
 * may undo up to 15 things. Stack also stores the position of the cursor
 * upon each change
 * 
 * @returns {undefined}
 */
function updateStack() {
    var checkEqual = currentStack.pop();
    if (checkEqual[0] === document.getElementById("userText").value) {
        checkEqual[1] = start + "";
        checkEqual[2] = end + "";
        currentStack.push(checkEqual);
    } else {
        currentStack = [];
        oldStack.push(checkEqual);
        while (oldStack.length > 15) {
            oldStack.shift();
        }
        var change = [];
        var cursor = document.getElementById(focus);
        var strt = cursor.selectionStart + "";
        var ed = cursor.selectionEnd + "";
        change.push(document.getElementById("userText").value);
        change.push(strt);
        change.push(ed);
        currentStack.push(change);
    }
}

/**
 * Called when userText is scrolled. Updates the top of the area the box is
 * scrolled to.
 * 
 * @returns {undefined}
 */
function updateScroll() {
    var x = document.getElementById("userText");
    scroll = x.scrollTop;
}

/**
 * Used to scroll the textbox. If the call passes 0, the textbox scrolls
 * down one page, if it is passed 1 it scrolls up, 2 it goes to the bottom of
 * the textbox, and 3 it goes to the top.
 * 
 * @param {type} direction Used to determine how the user wishes to scroll.
 * Varries from 0-3
 * @returns {undefined}
 */
function navigation(direction) {
    var x = document.getElementById("userText");
    switch (direction) {
        case 0:
            //Scroll down one window
            x.scrollTop = scroll + textareaSize;
            break;
        case 1:
            //Scroll up one window
            x.scrollTop = scroll - textareaSize;
            break;
        case 2:
            //Scroll to bottom
            x.scrollTop = x.scrollHeight;
            break;
        case 3:
            //Scroll to top
            x.scrollTo(0, 0);
            break;
    }
}

/**
 * Checks the field that is in focus. 
 * 
 * @param {type} num If num = 1 then the textbox is in focus and if it is 0
 * then the title is in focus
 * @returns {undefined}
 */
function checkField(num) {

    if (num === 1) {
        focus = "userText";
    } else if (num === 0) {
        focus = "title";
    }
    getCursor();
}

/**
 * Called on unload of the page.
 * Calls the edit() function as to update the blog when the user leaves the page
 * 
 * @returns {undefined}
 */
function checkSave() {
    edit();
}


/**
 * Edits a blog on the server by it's unique ID
 * 
 * @author Ali (Primary) and Jacob (Secondary)
 * @returns {undefined}
 */
function edit() {

    var title = document.getElementById("title").value;
    //If title is empty, fill it with todays date
    if (title === "") {
        var date;
        var month = new Date().getMonth();
        var day = new Date().getDate();
        var year = new Date().getFullYear();
        switch (month) {
            case 0:
                date = "January";
                break;
            case 1:
                date = "February";
                break;
            case 2:
                date = "March";
                break;
            case 3:
                date = "April";
                break;
            case 4:
                date = "May";
                break;
            case 5:
                date = "June";
                break;
            case 6:
                date = "July";
                break;
            case 7:
                date = "August";
                break;
            case 8:
                date = "September";
                break;
            case 9:
                date = "October";
                break;
            case 10:
                date = "November";
                break;
            case 11:
                date = "December";
                break;
        }
        title = date + " " + day + " " + year;
    }
    var body = document.getElementById("userText").value;
    var time = Date.now();
    var blogId = document.getElementById('blogId').innerHTML;
    blogId = JSON.parse(blogId);
    var user = document.getElementById('userId').innerHTML;
    user = JSON.parse(user);
    title = encodeURIComponent(title);
    body = encodeURIComponent(body);
    data = 'title=' + title + '&body=' + body + "&time=" + time;
    console.log(blogId);
    var xhttp = new XMLHttpRequest();
    xhttp.open('put', '/' + user + '/' + blogId, true);
    xhttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    xhttp.send(data);
}

/**
 * Get the position of the cursor inside of the element in focus
 * 
 * @returns {undefined}
 */
function getCursor() {
    curs = document.getElementById(focus);
    start = curs.selectionStart;
    end = curs.selectionEnd;
}

/**
 * Creates the keyboard. Edits were made to open source code from
 * https://codepen.io/dcode-software/pen/KYYKxP
 * 
 * @type type
 */
const Keyboard = {
    elements: {
        main: null,
        keysContainer: null,
        keys: []
    },

    eventHandlers: {
        oninput: null,
        onclose: null
    },

    properties: {
        value: "",
        capsLock: true
    },

    init() {
        // Create main elements
        this.elements.main = document.createElement("div");
        this.elements.keysContainer = document.createElement("div");

        // Setup main elements
        this.elements.main.classList.add("keyboard", "keyboard--hidden");
        this.elements.keysContainer.classList.add("keyboard__keys");
        this.elements.keysContainer.appendChild(this._createKeys());

        this.elements.keys = this.elements.keysContainer.querySelectorAll(".keyboard__key");

        // Add to DOM
        this.elements.main.appendChild(this.elements.keysContainer);
        document.body.appendChild(this.elements.main);
    },

    _createKeys() {
        const fragment = document.createDocumentFragment();

        // Creates HTML for an icon
        const createIconHTML = (icon_name) => {
            return `<i class="material-icons">${icon_name}</i>`;
        };

        var q = 0;
        capBoard.forEach(key => {

            const keyElement = document.createElement("button");

            const insertLineBreak = ["Backspace", "DeleteWord", "Enter", "?"].indexOf(key) !== -1;

            // Add attributes/classes
            keyElement.setAttribute("type", "button");
            keyElement.classList.add("keyboard__key");

            switch (key) {
                case "Backspace":
                    keyElement.classList.add("keyboard__key--more-wide");
                    keyElement.innerHTML = "Backspace";

                    keyElement.addEventListener("click", () => {
                        del();
                    });

                    break;

                case "DeleteWord":
                    keyElement.classList.add("keyboard__key--more-wide");
                    keyElement.innerHTML = "Delete Word";

                    keyElement.addEventListener("click", () => {
                        delword();
                    });

                    break;


                case "Caps":
                    keyElement.classList.add("keyboard__key--wide", "keyboard__key--activatable");
                    keyElement.innerHTML = "Caps";

                    keyElement.addEventListener("click", () => {
                        this._toggleCapsLock();
                        keyElement.classList.toggle("keyboard__key--active", this.properties.capsLock);
                    });

                    break;
                case "Undo":
                    keyElement.classList.add("keyboard__key--wide", "keyboard__key--activatable");
                    keyElement.innerHTML = "Undo";

                    keyElement.addEventListener("click", () => {
                        undo();
                    });

                    break;
                case "Redo":
                    keyElement.classList.add("keyboard__key--wide", "keyboard__key--activatable");
                    keyElement.innerHTML = "Redo";

                    keyElement.addEventListener("click", () => {
                        redo();
                    });

                    break;

                case "Enter":
                    keyElement.classList.add("keyboard__key--wide");
                    keyElement.innerHTML = "Enter";

                    keyElement.addEventListener("click", () => {
                        addWord("\n");
                    });

                    break;

                case "Space Bar":
                    keyElement.classList.add("keyboard__key--extra-wide");
                    keyElement.innerHTML = "Space Bar";

                    keyElement.addEventListener("click", () => {
                        addWord(" ");
                    });

                    break;
                default:
                    if (q < 5) {
                        keyElement.classList.add("keyboard__key--predict-wide");
                    }
                    keyElement.textContent = key.toLowerCase();

                    keyElement.addEventListener("click", () => {
                        addWord(keyElement.textContent);
                    });
                    break;
            }

            fragment.appendChild(keyElement);

            if (insertLineBreak || q === 4) {
                fragment.appendChild(document.createElement("br"));
            }
            q++;
        });

        return fragment;
    },

    _toggleCapsLock() {
        this.properties.capsLock = !this.properties.capsLock;
        document.getElementById(focus).focus();
        var board;
        if (this.properties.capsLock) {
            board = capBoard;
        } else {
            board = lowerBoard;
        }
        var i = 0;
        for (const key of this.elements.keys) {

            if (key.childElementCount === 0) {
                key.textContent = board[i];
            }
            i++;
        }
    }
};

window.addEventListener("DOMContentLoaded", function () {
    Keyboard.init();
});

