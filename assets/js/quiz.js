let currentQuestions = [];
let currentQuestionIndex = 0;
let score = 0;

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function startQuiz(data) {
    currentQuestions = shuffleArray([...data]).map(q => {
        let correctText = q.options[q.correct];
        let shuffledOptions = shuffleArray([...q.options]);
        let newCorrectIndex = shuffledOptions.indexOf(correctText);
        return {
            question: q.question,
            options: shuffledOptions,
            correct: newCorrectIndex
        };
    });
    
    currentQuestionIndex = 0;
    score = 0;
    document.getElementById('quiz-result').style.display = 'none';
    document.getElementById('quiz-box').style.display = 'block';
    loadQuestion();
}

function loadQuestion() {
    if (currentQuestionIndex >= currentQuestions.length) {
        showResult();
        return;
    }

    const q = currentQuestions[currentQuestionIndex];
    document.getElementById('question-text').innerText = `Câu ${currentQuestionIndex + 1}: ${q.question}`;
    
    const optionsDiv = document.getElementById('options-container');
    optionsDiv.innerHTML = '';
    
    q.options.forEach((opt, index) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = opt;
        btn.onclick = () => checkAnswer(index, q.correct, btn, optionsDiv);
        optionsDiv.appendChild(btn);
    });

    document.getElementById('progress').innerText = `Câu ${currentQuestionIndex + 1} / ${currentQuestions.length}`;
}

function checkAnswer(selectedIndex, correctIndex, selectedBtn, optionsDiv) {
    const buttons = optionsDiv.getElementsByTagName('button');
    for (let btn of buttons) {
        btn.disabled = true;
    }

    if (selectedIndex === correctIndex) {
        selectedBtn.classList.add('correct');
        score++;
    } else {
        selectedBtn.classList.add('wrong');
        buttons[correctIndex].classList.add('correct');
    }

    setTimeout(() => {
        currentQuestionIndex++;
        loadQuestion();
    }, 1200);
}

function showResult() {
    document.getElementById('quiz-box').style.display = 'none';
    const resultDiv = document.getElementById('quiz-result');
    resultDiv.style.display = 'block';
    
    let message = "";
    let percent = (score / currentQuestions.length) * 100;
    if(percent >= 80) message = "Quá xuất sắc! Em đã nắm rất vững kiến thức.";
    else if(percent >= 50) message = "Khá lắm! Cố gắng xem lại bài một chút nhé.";
    else message = "Đừng nản chí! Hãy xem lại video bài giảng và thử lại.";

    resultDiv.innerHTML = `
        <h2 style="color:var(--primary-color); font-size:2rem;">Hoàn thành!</h2>
        <div style="font-size:4rem; margin:20px 0;">🎯</div>
        <p style="font-size:1.5rem; margin-bottom:10px;">Điểm của em: <strong>${score} / ${currentQuestions.length}</strong></p>
        <p style="color:#666; margin-bottom:30px;">${message}</p>
        <button class="btn btn-primary" onclick="location.reload()">Làm lại</button>
        <a href="thu-thach.html" class="btn btn-secondary">Thử thách tiếp theo</a>
    `;
}
