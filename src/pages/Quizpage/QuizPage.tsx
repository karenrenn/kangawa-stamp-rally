// React
import { useState } from "react";

// サードパーティ
import { useNavigate, useLocation, Navigate } from "react-router-dom";

// 内部モジュール
import { useUserContext } from "../../hooks/useContext";
import { ROUTES } from "../../constants/routes";
import { logger } from "../../utils/logger";
import type { Stamp, QuizData } from "../../types/stamp";

// アセット
import background from "../../assets/images/background.png";

// CSS
import styles from "./QuizPage.module.css";

const QuizPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const uuid = useUserContext();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alreadyOwned, setAlreadyOwned] = useState(false);

  const stampDataFromState = location.state?.stampData as Stamp | undefined;
  
  const quizDto = stampDataFromState?.quizDto;
  const initialQuizData: QuizData = quizDto
    ? {
        id: quizDto.quizNo,
        question: quizDto.quizText,
        options: [
          quizDto.option1,
          quizDto.option2,
          quizDto.option3,
          quizDto.option4,
        ],
        answer: quizDto.answerNo,
        explanation: quizDto.explanation,
      }
    : {
        id: 0,
        question: "",
        options: ["", "", "", ""],
        answer: 1,
        explanation: "",
      };

  const [quizData] = useState<QuizData>(initialQuizData);

  // データがない場合は即座にリダイレクト（ちらつき防止）
  if (!stampDataFromState) {
    return <Navigate to={ROUTES.SCAN} replace />;
  }

  const handleOptionClick = (option: string) => {
    setSelectedOption(option);
  };

  const handleQuizComplete = () => {
    if (selectedOption) {
      const selectedIndex = quizData.options.indexOf(selectedOption) + 1;

      if (selectedIndex === quizData.answer) {
        setIsCorrect(true);
      } else {
        setIsCorrect(false);
      }
      setQuizCompleted(true);
    } else {
      alert("選択肢を選んでください！");
    }
  };

  const handleGetStamp = async () => {
    if (!stampDataFromState) return;
    
    setIsSubmitting(true);
    const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === "true";
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
    const stampId = stampDataFromState.stampNo;

    try {
      if (USE_MOCK_DATA) {
        // モックモードの場合、既存のスタンプをチェック
        const response = await fetch("/data/top_mock.json");
        const existingStamps = await response.json();
        
        // 既に持っているスタンプか確認
        const alreadyHasStamp = existingStamps.some(
          (stamp: Stamp) => stamp.stampNo === stampId
        );
        
        if (alreadyHasStamp) {
          logger.log("スタンプは既に登録済みです（モック）:", stampId);
          setAlreadyOwned(true);
        } else {
          logger.log("スタンプ登録モック成功:", stampDataFromState);
          navigate(ROUTES.SCAN_SUCCESS, {
            state: { stampData: stampDataFromState },
          });
        }
      } else {
        if (!apiBaseUrl) {
          throw new Error("API base URL is not configured.");
        }
        const apiUrl = `${apiBaseUrl}/add`;
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uuid, stampId }),
        });

        if (response.ok) {
          const stampDataFromApi = await response.json();
          logger.log("スタンプ登録成功:", stampDataFromApi);
          navigate(ROUTES.SCAN_SUCCESS, {
            state: { stampData: stampDataFromApi },
          });
        } else if (response.status === 400 || response.status === 409) {
          // 登録済みの可能性がある場合、レスポンスを確認
          const errorData = await response.json();
          if (errorData.message && errorData.message.includes("すでに獲得済み")) {
            logger.log("スタンプは既に登録済みです");
            setAlreadyOwned(true);
          } else {
            logger.error("スタンプ登録失敗:", response.status, errorData);
            navigate(ROUTES.SCAN_FAIL);
          }
        } else {
          logger.error(
            "スタンプ登録失敗:",
            response.status,
            await response.text()
          );
          navigate(ROUTES.SCAN_FAIL);
        }
      }
    } catch (apiError) {
      logger.error("API呼び出し中にエラーが発生しました:", apiError);
      navigate(ROUTES.SCAN_FAIL);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={styles.quizPage}
      style={{ backgroundImage: `url(${background})` }}
    >
      <div className={styles.quizContent}>
        <h1 className={styles.quizTitle}>かながわくクイズ</h1>
        <h2 className={styles.quizQuestion}>{quizData.question}</h2>
        <div className={styles.quizOptions}>
          {quizData.options.map((option, index) => (
            <button
              key={option}
              type="button"
              className={`${styles.quizOption} ${
                selectedOption === option ? styles.selected : ""
              } ${
                quizCompleted &&
                quizData.options.indexOf(option) + 1 === quizData.answer
                  ? styles.correctAnswer
                  : ""
              } ${
                quizCompleted && !isCorrect && selectedOption === option
                  ? styles.wrongAnswer
                  : ""
              }`}
              onClick={() => handleOptionClick(option)}
              disabled={quizCompleted}
            >
              <span className={styles.optionNumber}>{index + 1}</span>
              <span className={styles.optionText}>{option}</span>
            </button>
          ))}
        </div>
        {quizCompleted && (
          <div className={styles.answerDisplayArea}>
            <div
              className={`${styles.answerMessage} ${
                isCorrect ? styles.correct : styles.incorrect
              }`}
            >
              {isCorrect ? (
                <div>
                  せいかい！🎉
                <span className={styles.explanation}>
                    {quizData.explanation}
                  </span>
                </div>

              ) : (
                <div>
                  <p>ざんねん！</p>
                  <p>正解は「{quizData.options[quizData.answer - 1]}」だよ！</p>
                  <span className={styles.explanation}>
                    {quizData.explanation}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
        {!quizCompleted && (
          <button
            type="button"
            className={styles.quizButton}
            onClick={handleQuizComplete}
            disabled={!selectedOption}
          >
            こたえをみる！
          </button>
        )}
        {quizCompleted && (
          <>
            {alreadyOwned && (
              <div className={styles.alreadyOwnedMessage}>
                <p className={styles.alreadyOwnedText}>
                  このスタンプはすでに持っているよ！
                </p>
              </div>
            )}
            <button
              type="button"
              className={styles.quizButton}
              onClick={alreadyOwned ? () => navigate(ROUTES.STAMPS) : handleGetStamp}
              disabled={isSubmitting && !alreadyOwned}
            >
              {alreadyOwned ? 'スタンプ一覧を見る' : 'スタンプをもらう！'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};
export default QuizPage;
