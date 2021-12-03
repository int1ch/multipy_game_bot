import { telegramReply } from "./telegramReply";

function getMockedContext() {
  const replyMock = jest.fn();
  replyMock.mockResolvedValue(undefined);
  const context = {
    reply: replyMock,
  };
  return [context, replyMock] as const;
}
test("telegram  text replay", () => {
  const [context, replyMock] = getMockedContext();
  telegramReply(context, { text: "HelloWorld" });
  expect(replyMock).toBeCalledTimes(1);
  //expect AUTOMATIC remove of keyboard
  expect(replyMock).toBeCalledWith("HelloWorld", {
    reply_markup: { remove_keyboard: true },
  });
});
test("telegram  text replay variants", () => {
  const [context, replyMock] = getMockedContext();
  telegramReply(context, { text: "HelloWorld", variants: ["1", "A"] });
  expect(replyMock).toBeCalledTimes(1);
  expect(replyMock).toMatchSnapshot();
  /*"HelloWorld", {
    reply_markup: {
      keyboard: [
        [
          {
            text: "1",
          },
          {
            text: "A",
          },
        ],
      ],
      one_time_keyboard: true,
    },
  });*/
});

test("telegram  text MarkdownV2", () => {
  const [context, replyMock] = getMockedContext();
  telegramReply(context, { text: "HelloWorld", parse_mode: "MarkdownV2" });
  expect(replyMock).toBeCalledTimes(1);
  expect(replyMock).toBeCalledWith("HelloWorld", {
    parse_mode: "MarkdownV2",
    reply_markup: { remove_keyboard: true },
  });
});
