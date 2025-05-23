import $, { Cash } from 'cash-dom'

import { convertParsonsGraderFuncToEnum, convertTestVariablesToString, convertUnitTestsFromString } from './converters'
import {
  ParsonsGrader, ParsonsOptions, ParsonsSettings, VariableTest, UnitTest
} from '../@types/types'
import { tryToCreateEditorFromTextarea } from './editor'

interface CodeBlocks {
  codeBlocks: string;
  distractorBlocks: string;
}

const getCodeBlocks = (code: string): CodeBlocks => {
  const codeBlocks: string[] = []
  const distractorsBlocks: string[] = []
  const lines = code.split('\n')
  const pattern = /(.*?)\s*#distractor\s*$/

  lines.forEach((line: string) => {
    if (!line) {
      return
    }
    if (line.search(pattern) !== -1) {
      distractorsBlocks.push(line.replace(/#distractor\s*$/, ''))
    } else {
      codeBlocks.push(line)
    }
  })
  return {
    codeBlocks: codeBlocks.join('\n'),
    distractorBlocks: distractorsBlocks.join('\n')
  }
}

const renderCodeContainHtmlCheckbox = (): Cash => {
  const containHtmlContainer: Cash = $('<div class="contain-html-container fieldset"></div>')

  containHtmlContainer.append('<input id="code-contain-html" type="checkbox" />')
  containHtmlContainer.append(
    '<label for="code-contain-html" class="code-contain-html-label">Code blocks contain HTML?</label>'
  )

  return containHtmlContainer
}

const renderInitialCodeBlock = (codeBlocks: string): Cash => {
  const codeBlocksContainer: Cash = $('<div class="code-blocks-container"></div>')

  const taContainer: Cash = $('<div class="code-blocks-ta-container fieldset"></div>')
  taContainer.append('<label for="initial">Code to Become Blocks</label>')
  const taCode: Cash = $(`<textarea id="initial" rows="7">${codeBlocks}</textarea>`)
  taCode.attr('placeholder', 'Type solution with expected indentation here')
  taContainer.append(taCode)
  codeBlocksContainer.append(taContainer)

  tryToCreateEditorFromTextarea(taCode)

  codeBlocksContainer.append(renderCodeContainHtmlCheckbox())

  const hintText1 = '$$toggle::value1::value2::valuen$$'
  const hintText2 = 'new line \\n in same block'
  codeBlocksContainer.append(`<div class="code-blocks-hint">${hintText1}<br/>${hintText2}</div>`)

  return codeBlocksContainer
}

const renderDistractorBlocks = (distractors: string, maxWrongLines?: number): Cash => {
  const distractorBlockContainer: Cash = $('<div class="distractor-blocks-container"></div>')
  const taContainer: Cash = $('<div class="distractor-blocks-ta-container fieldset"></div>')

  taContainer.append('<label for="distractors">Code to Become Distractor Blocks</label>')
  const taDistractors: Cash = $(`<textarea id="distractors" rows="6">${distractors}</textarea>`)
  taDistractors.attr('placeholder', 'Code blocks that serve as distractions (incorrect options)')
  taContainer.append(taDistractors)
  distractorBlockContainer.append(taContainer)

  tryToCreateEditorFromTextarea(taDistractors)

  const maxDistractorsTitle = 'The maximum number of distractor blocks added to the solution blocks when a student sees'
      + 'the problem. Use this if you, for example, have 4 distractor options but want only 2 to randomly display.'

  const maxDistractors: number = maxWrongLines || 10
  const maxDistractorsContainer: Cash = $('<div class="distractor-blocks-max-container fieldset"></div>')
  maxDistractorsContainer.append('<label for="max-distractors">Max Distractors</label>')
  maxDistractorsContainer.append(
    `<input id="max-distractors" type="number" title="${maxDistractorsTitle}" value="${maxDistractors}" />`
  )
  distractorBlockContainer.append(maxDistractorsContainer)

  return distractorBlockContainer
}

const renderGraderSelect = (grader?: (() => void) | string | undefined): Cash => {
  const graderContainer: Cash = $('<div class="grader-container fieldset"></div>')

  graderContainer.append('<label for="grader">Grader</label>')
  const graderSelect: Cash = $('<select id="grader"></select>')
  graderSelect.append(`<option value="${ParsonsGrader.LineBased}">LineBasedGrader</option>`)
  graderSelect.append(`<option value="${ParsonsGrader.VariableCheck}">VariableCheckGrader</option>`)
  graderSelect.append(`<option value="${ParsonsGrader.UnitTest}">UnitTestGrader</option>`)
  graderSelect.append(`<option value="${ParsonsGrader.LanguageTranslation}">LanguageTranslationGrader</option>`)
  graderSelect.append(`<option value="${ParsonsGrader.Turtle}">TurtleGrader</option>`)

  graderSelect.val(convertParsonsGraderFuncToEnum(grader))
  graderContainer.append(graderSelect)

  return graderContainer
}

const renderShowFeedback = (showFeedback?: boolean): Cash => {
  const showFeedbackContainer: Cash = $('<div class="show-feedback-container fieldset"></div>')

  showFeedbackContainer.append('<label for="show-feedback">Show feedback</label>')
  showFeedbackContainer.append(`<input id="show-feedback" type="checkbox" ${showFeedback === false ? '' : 'checked'} />`)

  return showFeedbackContainer
}

const renderRequireDragging = (requireDragging: boolean): Cash => {
  const draggingContainer: Cash = $('<div class="dragging-container fieldset"></div>')

  draggingContainer.append('<label for="require-dragging">Require dragging?</label>')
  draggingContainer.append(`<input id="require-dragging" type="checkbox" ${requireDragging ? 'checked' : ''} />`)

  return draggingContainer
}

const renderIndenting = (canIndent?: boolean): Cash => {
  const indentingContainer: Cash = $('<div class="indenting-container fieldset"></div>')

  indentingContainer.append('<label for="disable-indent">Disable indentation?</label>')
  indentingContainer.append(
    `<input id="disable-indent" type="checkbox" ${canIndent === false ? 'checked' : ''} />`
  )

  return indentingContainer
}

const renderIndentSize = (canIndent?: boolean, xIndent?: number): Cash => {
  const indentSizeContainer: Cash = $('<div class="indent-size-container fieldset"></div>')

  indentSizeContainer.append('<label for="indent-size">Indent Size(px)</label>')
  indentSizeContainer.append(
    `<input id="indent-size" type="text" value="${
      xIndent !== undefined ? xIndent : 50
    }" ${canIndent === false ? 'disabled' : ''} />`
  )

  return indentSizeContainer
}

const renderExecLimit = (execLimit?: number): Cash => {
  const draggingContainer: Cash = $('<div class="exec-limit-container fieldset"></div>')

  draggingContainer.append('<label for="exec-limit">Exec Limit(ms)</label>')
  draggingContainer.append(
    `<input id="exec-limit" type="text" value="${execLimit !== undefined ? execLimit : 2500}" />`
  )

  return draggingContainer
}

const renderCommonSettings = (hasDistractors: boolean, options: ParsonsOptions): Cash => {
  const commonSettingsContainer: Cash = $('<div class="common-settings-container"></div>')

  commonSettingsContainer.append(renderGraderSelect(options.grader))

  const requireDragging: boolean = hasDistractors || !!options.trashId
  commonSettingsContainer.append(renderShowFeedback(options.show_feedback))
  commonSettingsContainer.append(renderRequireDragging(requireDragging))
  commonSettingsContainer.append(renderIndenting(options.can_indent))
  commonSettingsContainer.append(renderIndentSize(options.can_indent, options.x_indent))
  commonSettingsContainer.append(renderExecLimit(options.exec_limit))

  return commonSettingsContainer
}

export const renderVarTest = (test?: VariableTest | undefined): Cash => {
  const testContainer: Cash = $('<li class="test-container"></li>')

  const actionsContainer = $('<div class="action-container"></div>')
  actionsContainer.append('<a class="btn action duplicate">clone</a>')
  actionsContainer.append('<a class="btn action remove">remove</a>')
  testContainer.append(actionsContainer)

  const testInfoContainer = $('<div class="test-info-container"></div>')
  const column1 = $('<div class="column"></div>')

  const variablesContainer = $('<div class="fieldset"></div>')
  variablesContainer.append('<label>Expected variable values*</label>')
  const taVariables = $(
    `<textarea rows="2" name="variables">${test ? convertTestVariablesToString(test.variables) : ''}</textarea>`
  )
  taVariables.attr('placeholder', '"var_Name_1": value\n"var_Name_2": value')
  variablesContainer.append(taVariables)
  column1.append(variablesContainer)

  tryToCreateEditorFromTextarea(taVariables)

  const descriptionContainer = $('<div class="fieldset"></div>')
  descriptionContainer.append('<label>Test Description*</label>')
  const taDescription = $(`<textarea rows="2" name="description">${test ? test.message : ''}</textarea>`)
  taDescription.attr('placeholder', 'Description of test that is shown to learner')
  descriptionContainer.append(taDescription)
  column1.append(descriptionContainer)

  tryToCreateEditorFromTextarea(taDescription)

  const column2 = $('<div class="column"></div>')

  const preCodeContainer = $('<div class="fieldset"></div>')
  preCodeContainer.append('<label>Pre Code</label>')
  const taPreCode = $(`<textarea rows="2" name="pre-code">${test ? test.initcode : ''}</textarea>`)
  taPreCode.attr('placeholder', 'Code prepended before student code')
  preCodeContainer.append(taPreCode)
  column2.append(preCodeContainer)

  tryToCreateEditorFromTextarea(taPreCode)

  const postCodeContainer = $('<div class="fieldset"></div>')
  postCodeContainer.append('<label>Post Code</label>')
  const taPostCode = $(`<textarea rows="2" name="post-code">${test ? test.code : ''}</textarea>`)
  taPostCode.attr('placeholder', 'Code appended after student code')
  postCodeContainer.append(taPostCode)
  column2.append(postCodeContainer)

  tryToCreateEditorFromTextarea(taPostCode)

  testInfoContainer.append(column1)
  testInfoContainer.append(column2)
  testContainer.append(testInfoContainer)
  return testContainer
}

const renderVariableCheckGrader = (
  showHint: boolean,
  options?: ParsonsOptions,
  additionalGraderClass?: string
): Cash => {
  const classes: string[] = [
    'grader-form-container',
    'variable-check-grader-container',
    additionalGraderClass || ''
  ]
  const graderFormContainer = $(`<div class="${classes.join(' ')}"></div>`)

  const hint: string = showHint ? '<span class="grader-hint">This Grader only supports Python. For other languages, '
      + 'try the Language Translation Grader.</span>' : ''
  graderFormContainer.append(
    `<div class="add-test-container"><a id="add-test" class="btn btn--primary">New Test</a>${hint}</div>`
  )
  const testsContainer: Cash = $('<div class="tests-container"></div>')
  const testsList: Cash = $('<ul class="tests-list"></ul>')

  if (options && options.vartests) {
    options.vartests.forEach((test: VariableTest) => testsList.append(renderVarTest(test)))
  } else {
    testsList.append(renderVarTest())
  }
  testsContainer.append(testsList)
  graderFormContainer.append(testsContainer)

  return graderFormContainer
}

const renderUnitTestCodePrepend = (code?: string): Cash => {
  const codePrependContainer: Cash = $('<div class="code-prepend-container"></div>')

  const taContainer: Cash = $('<div class="code-prepend-ta-container fieldset"></div>')
  taContainer.append('<label for="code-prepend">Code prepended before student code</label>')
  const taCode: Cash = $(`<textarea id="code-prepend" rows="4">${code || ''}</textarea>`)
  taCode.attr('placeholder', 'Code prepended before student code')
  taContainer.append(taCode)
  codePrependContainer.append(taContainer)

  tryToCreateEditorFromTextarea(taCode)

  return codePrependContainer
}

export const renderUnitTest = (test?: UnitTest | undefined): Cash => {
  const testContainer: Cash = $('<li class="test-container"></li>')
  $(testContainer).data('test-name', test ? test.name : '')

  const actionsContainer = $('<div class="action-container"></div>')
  actionsContainer.append('<a class="btn action duplicate">clone</a>')
  actionsContainer.append('<a class="btn action remove">remove</a>')
  testContainer.append(actionsContainer)

  const testInfoContainer = $('<div class="test-info-container"></div>')
  const column1 = $('<div class="column"></div>')

  const methodsContainer = $('<div class="fieldset"></div>')
  methodsContainer.append('<label>Method Call(s)*</label>')
  const methodCall = test ? test.assertEquals.methodCall : ''
  const taMethods = $(
    `<textarea rows="2" name="method-call">${methodCall}</textarea>`
  )
  taMethods.attr('placeholder', 'Write method call with arguments')
  methodsContainer.append(taMethods)
  column1.append(methodsContainer)

  tryToCreateEditorFromTextarea(taMethods)

  const messageContainer = $('<div class="fieldset"></div>')
  messageContainer.append('<label>Error Message (optional)</label>')
  const errorMessage = test ? test.assertEquals.errorMessage : ''
  const taMessage = $(`<textarea rows="2" name="error-message">${errorMessage}</textarea>`)
  taMessage.attr('placeholder', 'What student sees if this test fails')
  messageContainer.append(taMessage)
  column1.append(messageContainer)

  tryToCreateEditorFromTextarea(taMessage)

  const column2 = $('<div class="column"></div>')

  const expectedOutputContainer = $('<div class="fieldset"></div>')
  expectedOutputContainer.append('<label>Expected Output(s)*</label>')
  const expectedOutput = test ? test.assertEquals.expectedOutput : ''
  const taExpectedOutput = $(`<textarea rows="2" name="expected-output">${expectedOutput}</textarea>`)
  taExpectedOutput.attr('placeholder', 'Expected output of method call')
  expectedOutputContainer.append(taExpectedOutput)
  column2.append(expectedOutputContainer)

  tryToCreateEditorFromTextarea(taExpectedOutput)

  testInfoContainer.append(column1)
  testInfoContainer.append(column2)
  testContainer.append(testInfoContainer)
  return testContainer
}

const renderUnitTestGrader = (options?: ParsonsOptions): Cash => {
  const graderFormContainer = $('<div class="grader-form-container unit-test-grader-container"></div>')

  graderFormContainer.append(renderUnitTestCodePrepend(options ? options.unittest_code_prepend : ''))

  const tests: UnitTest[] | null = options ? convertUnitTestsFromString(options.unittests) : null

  graderFormContainer.append(
    '<div class="add-test-container">'
    + '<a id="add-test" class="btn btn--primary">New Test</a>'
    + '<span class="grader-hint">This Grader only supports Python.</span>'
    + '</div>'
  )
  const testsContainer: Cash = $('<div class="tests-container"></div>')
  const testsList: Cash = $('<ul class="tests-list"></ul>')

  if (tests) {
    tests.forEach((test: UnitTest) => testsList.append(renderUnitTest(test)))
  } else {
    testsList.append(renderUnitTest())
  }
  testsContainer.append(testsList)
  graderFormContainer.append(testsContainer)

  return graderFormContainer
}

const renderProgrammingLang = (grader: ParsonsGrader, lang?: string): Cash => {
  const programmingLangContainer: Cash = $('<div class="programming-lang-container fieldset"></div>')

  const labelSuffix = grader === ParsonsGrader.Turtle ? '(if solution code above is not python)' : ''
  programmingLangContainer.append(`<label for="programming-lang">Programming Language ${labelSuffix}</label>`)
  const programmingLangSelect: Cash = $('<select id="programming-lang"></select>')
  programmingLangSelect.append('<option value="pseudo">pseudocode</option>')
  programmingLangSelect.append('<option value="java">java</option>')

  if (lang) {
    programmingLangSelect.val(lang)
  }
  programmingLangContainer.append(programmingLangSelect)

  return programmingLangContainer
}

const renderExecutableCode = (grader: ParsonsGrader, code?: string): Cash => {
  const executableCodeContainer: Cash = $('<div class="executable-code-container"></div>')

  const taContainer: Cash = $('<div class="executable-code-ta-container fieldset"></div>')
  const labelSuffix = grader === ParsonsGrader.Turtle ? '(if solution code above is not python)' : ''
  taContainer.append(`<label for="executable-code">Executable code ${labelSuffix}</label>`)
  const taCode: Cash = $(`<textarea id="executable-code" rows="4">${code || ''}</textarea>`)
  const placeholderSuffix = grader === ParsonsGrader.Turtle ? '\nimport turtle\n'
    + 'myTurtle = turtle.Turtle() -- are done for you' : ''
  taCode.attr('placeholder', `Executable Python code to map to solution blocks${placeholderSuffix}`)
  taContainer.append(taCode)
  executableCodeContainer.append(taContainer)

  tryToCreateEditorFromTextarea(taCode)

  return executableCodeContainer
}

const renderTurtleModelCode = (code?: string): Cash => {
  const turtleModelCodeContainer: Cash = $('<div class="turtle-model-code-container"></div>')

  const taContainer: Cash = $('<div class="turtle-model-code-ta-container fieldset"></div>')
  taContainer.append(
    '<label for="turtle-model-code">Turtle Model Code ('
    + 'Uses <a href="https://docs.python.org/3.3/library/turtle.html" target="_blank">Python turtle library</a>'
    + ')</label>'
  )
  const taCode: Cash = $(`<textarea id="turtle-model-code" rows="4">${code || ''}</textarea>`)
  taCode.attr('placeholder', 'import turtle\nmodelTurtle = turtle.Turtle() -- are done for you')
  taContainer.append(taCode)
  turtleModelCodeContainer.append(taContainer)

  tryToCreateEditorFromTextarea(taCode)

  return turtleModelCodeContainer
}

const renderLanguageTranslationGrader = (options?: ParsonsOptions): Cash => {
  const grader: Cash = renderVariableCheckGrader(false, options, 'language-translation-grader-container')
  grader.prepend(renderExecutableCode(ParsonsGrader.LanguageTranslation, options ? options.executable_code : ''))
  grader.prepend(renderProgrammingLang(ParsonsGrader.LanguageTranslation, options ? options.programmingLang : ''))
  return grader
}

const renderTurtleGrader = (options?: ParsonsOptions): Cash => {
  const graderFormContainer = $('<div class="grader-form-container turtle-grader-container"></div>')

  const executableOptionsContainer: Cash = $('<div class="executable-options-container"></div>')

  const generateBtnContainer: Cash = $('<div class="generate-btn-container"></div>')
  generateBtnContainer.append(
    '<div class="generate-btn-hint">'
    + 'Use executable code (or if not specified, solution code) to generate modelTurtle code</div>'
  )
  generateBtnContainer.append(
    '<a id="generate-model-turtle" class="btn btn--primary">Generate<br/>modelTurtle Code</a>'
  )
  executableOptionsContainer.append(generateBtnContainer)

  const codeProgrammingLanguageContainer: Cash = $('<div class="code-programming-language-container"></div>')
  codeProgrammingLanguageContainer
    .append(renderProgrammingLang(ParsonsGrader.Turtle, options ? options.programmingLang : ''))
  codeProgrammingLanguageContainer
    .append(renderExecutableCode(ParsonsGrader.Turtle, options ? options.executable_code : ''))
  executableOptionsContainer.append(codeProgrammingLanguageContainer)

  graderFormContainer.append(executableOptionsContainer)
  graderFormContainer.append(renderTurtleModelCode(options ? options.turtleModelCode : ''))

  return graderFormContainer
}

const renderGraderForm = (container: Cash, grader: ParsonsGrader, options?: ParsonsOptions): void => {
  container.closest('.ParsonsUI').removeClass()
    .addClass(`ParsonsUI ${grader.toString().replace('ParsonsWidget._graders.', '')}`)
  container.find('.grader-form-container').remove()

  switch (grader) {
    case ParsonsGrader.VariableCheck:
      container.append(renderVariableCheckGrader(true, options))
      break
    case ParsonsGrader.UnitTest:
      container.append(renderUnitTestGrader(options))
      break
    case ParsonsGrader.LanguageTranslation:
      container.append(renderLanguageTranslationGrader(options))
      break
    case ParsonsGrader.Turtle:
      container.append(renderTurtleGrader(options))
      break
    default:
      break
  }
}

export const renderGrader = (container: Cash, grader: ParsonsGrader): void => {
  renderGraderForm(container.find('.ParsonsUI'), grader)
}

export const render = (container: Cash, settings: ParsonsSettings): void => {
  container.empty()

  const uiContainer: Cash = $('<div class="ParsonsUI"></div>')

  const codeBlocks: CodeBlocks = getCodeBlocks(settings.initial)

  uiContainer.append(renderInitialCodeBlock(codeBlocks.codeBlocks))
  uiContainer.append(renderDistractorBlocks(codeBlocks.distractorBlocks, settings.options.max_wrong_lines))
  uiContainer.append(renderCommonSettings(!!codeBlocks.distractorBlocks, settings.options))

  renderGraderForm(uiContainer, convertParsonsGraderFuncToEnum(settings.options.grader), settings.options)

  container.append(uiContainer)
}

export default {
  render
}