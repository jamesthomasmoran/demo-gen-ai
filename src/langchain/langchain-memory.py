from langchain.memory.chat_message_histories import DynamoDBChatMessageHistory
from langchain.memory import ConversationBufferMemory
from langchain.llms.bedrock import Bedrock
from langchain.chains import ConversationalRetrievalChain
from langchain.prompts import PromptTemplate
from langchain.retrievers import AmazonKendraRetriever
import os
import boto3
import json

BEDROCK_REGION = os.get('BEDROCK_REGION', 'us-west-2')
KENDRA_REGION = os.get('KENDRA_REGION', 'us-west-2')
KENDRA_INDEX_ID = os.get('KENDRA_INDEX_ID')
DYNAMO_SESSION_TABLE = os.get('DYNAMO_SESSION_TABLE', 'SessionTable')

def lambda_handler(event, context):
    
    query_params = json.loads(event["queryStringParameters"])
    
    user_input = query_params["userInput"]
    session_id = query_params["sessionId"]

    bedrock_runtime = boto3.client(
            service_name="bedrock-runtime",
            region_name=BEDROCK_REGION,
        )
    
    llm = Bedrock(
        model_id="anthropic.claude-instant-v1",
        client=bedrock_runtime,
        region_name=BEDROCK_REGION,
        model_kwargs={
           "max_tokens_to_sample":2000,
           "temperature":1,"top_k":250,
           "top_p":0.999,
           "anthropic_version":
           "bedrock-2023-05-31"}
    )


    retriever = AmazonKendraRetriever(index_id=KENDRA_INDEX_ID,region_name=KENDRA_REGION)


    message_history = DynamoDBChatMessageHistory(table_name=DYNAMO_SESSION_TABLE, session_id=session_id)

    memory = ConversationBufferMemory(
        output_key="answer",
        memory_key="chat_history",
        chat_memory=message_history,
        return_messages=True,
    )
    prompt_template = """Human: This is a friendly conversation between a human and an AI. 
  The AI is an expert Geoscientist and provides specific details from its context.
  If the AI does not know the answer to a question, it truthfully says it 
  does not know.

  Assistant: OK, got it, I'll be an expert Geoscientist AI assistant.

  Human: Here are a few documents in <documents> tags:
  <documents>
  {context}
  </documents>
  Based on the above documents, provide a detailed answer for, {question} 
  Answer "don't know" if not present in the document. 

  Assistant:
  """

    PROMPT = PromptTemplate(
        template=prompt_template, input_variables=["context", "question"]
    )

    condense_qa_template ="""{chat_history}
  Human:
  Given the previous conversation and a follow up question below, rephrase the follow up question
  to be a standalone question.

  Follow Up Question: {question}
  Standalone Question:

  Assistant:"""

    standalone_question_prompt = PromptTemplate.from_template(condense_qa_template)


    conversation = ConversationalRetrievalChain.from_llm(
        llm=llm, 
        retriever=retriever, 
        condense_question_prompt=standalone_question_prompt, 
        return_source_documents=True,
        memory=memory,
        combine_docs_chain_kwargs={"prompt":PROMPT})
    result = conversation({"question": user_input })
    
    

    source_documents = []
    if 'source_documents' in result:
      print('Sources:')
      for d in result['source_documents']:
        source_document = {
          'title': d.metadata['title']
       }

        if d.metadata['document_attributes']['s3_document_id']:
          #generate presigned url 
          source_document['source'] = d.metadata['source']
        else:
          source_document['source'] = d.metadata['source']
      
        source_documents.append(source_document)
    
    
    completion = {
       "answer": result['answer'],
       "sourceDocuments": source_documents
    }
    return {
      "statusCode": 200,
      
      "headers": {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
      },
      "body": completion,
    }
    

    
if __name__ == "__main__":
    print(lambda_handler({"body":'{"sessionId": "4", "userInput":"sagemaker training job?"}'}, ''))